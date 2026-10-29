import { Hono, type Context, type MiddlewareHandler } from "hono";
import type { BudgetDecision, WorkspaceBudgetKind } from "./workspace-budget.js";
import { HTTPException } from "hono/http-exception";
import { bearerAuth } from "hono/bearer-auth";
import { bodyLimit } from "hono/body-limit";
import type { DataStore, EventInput } from "./data-model.js";
import {
  StoreInputError,
  StoreNotFoundError,
  StoreQuotaError,
} from "./storage/postgres-store.js";
import { evaluateEvent, listRuleCatalog } from "./detections.js";
import {
  isUuid,
  MAX_BODY_BYTES,
  parseCaseCreate,
  parseCasePatch,
  parseEventBatch,
  parseEventQuery,
  ValidationError,
} from "./private-validation.js";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43,128}$/;
const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

type ErrorStatus = 400 | 401 | 403 | 404 | 405 | 409 | 413 | 429 | 500 | 503;
function errorResponse(
  c: Context,
  status: ErrorStatus,
  code: string,
  message: string,
) {
  return c.json({ error: { code, message } }, status);
}

function jsonContentType(request: Request): boolean {
  const value = request.headers.get("content-type");
  return (
    value !== null &&
    /^application\/json(?:\s*;\s*charset\s*=\s*"?utf-8"?)?\s*$/i.test(value)
  );
}

const sameOriginMutation: MiddlewareHandler = async (c, next) => {
  const origin = c.req.header("origin");
  if (origin === undefined) return next();
  try {
    if (new URL(origin).origin === new URL(c.req.url).origin) return next();
  } catch {
    // Invalid Origin values fail closed.
  }
  return errorResponse(
    c,
    403,
    "ORIGIN_FORBIDDEN",
    "Request origin is not allowed",
  );
};

async function parseJson(c: Context): Promise<unknown> {
  if (!jsonContentType(c.req.raw)) throw new ValidationError();
  try {
    return await c.req.json();
  } catch {
    throw new ValidationError();
  }
}

/**
 * Single configured-operator service key for a trusted, single workspace.
 * This is not interactive identity or multi-tenant authorization.
 */
export function createPrivateApi({
  store,
  token,
  prefix = "/api/private/v1",
  authenticate,
  consumeBudget,
}: {
  store: DataStore;
  token: string;
  prefix?: "/api/private/v1" | "/api/workspace/v1";
  authenticate?: MiddlewareHandler;
  consumeBudget?: (kind: WorkspaceBudgetKind, context: Context) => Promise<BudgetDecision>;
}): Hono {
  const PREFIX = prefix;
  if (!TOKEN_PATTERN.test(token))
    throw new Error("Private API requires a strong base64url service token");

  const app = new Hono();
  const buckets = new Map<
    "read" | "ingest" | "case-write",
    { windowStart: number; count: number }
  >();
  const authentication = authenticate ?? bearerAuth({
    token,
    realm: "veycord-private-api",
    noAuthenticationHeader: { message: "Authentication required" },
    invalidToken: { message: "Authentication required" },
    invalidAuthenticationHeader: { message: "Authentication required" },
  });

  app.use("*", async (c, next) => {
    await next();
    for (const [name, value] of Object.entries(NO_STORE_HEADERS))
      c.header(name, value);
  });
  app.use(PREFIX, authentication);
  app.use(`${PREFIX}/*`, authentication);
  app.use("*", async (c, next) => {
    const params = new URL(c.req.url).searchParams;
    const path = new URL(c.req.url).pathname;
    const eventSearch = c.req.method === "GET" && path === `${PREFIX}/events`;
    if (
      params.has("token") ||
      params.has("access_token") ||
      params.has("authorization") ||
      (params.size > 0 && !eventSearch)
    ) {
      return errorResponse(
        c,
        400,
        "INVALID_ARGUMENT",
        "Request could not be validated",
      );
    }
    await next();
  });

  const rateLimit =
    (kind: WorkspaceBudgetKind): MiddlewareHandler =>
    async (c, next) => {
      if (consumeBudget) {
        let decision: BudgetDecision;
        try { decision = await consumeBudget(kind, c); }
        catch { return errorResponse(c, 503, "BUDGET_UNAVAILABLE", "Request limits are temporarily unavailable. Try again later."); }
        if (!decision.allowed) {
          c.header("Retry-After", String(decision.retryAfterSeconds));
          return errorResponse(c, 429, "RATE_LIMITED", "Request rate limit exceeded. Wait before trying again.");
        }
        await next();
        return;
      }
      const now = Date.now();
      const limit = kind === "read" ? 60 : 10;
      let bucket = buckets.get(kind);
      if (!bucket || now - bucket.windowStart >= 60_000) {
        bucket = { windowStart: now, count: 0 };
        buckets.set(kind, bucket);
      }
      if (bucket.count >= limit) {
        c.header(
          "Retry-After",
          String(
            Math.max(1, Math.ceil((bucket.windowStart + 60_000 - now) / 1000)),
          ),
        );
        return errorResponse(
          c,
          429,
          "RATE_LIMITED",
          "Request rate limit exceeded",
        );
      }
      bucket.count += 1;
      await next();
    };
  const bodyLimitMiddleware = bodyLimit({
    maxSize: MAX_BODY_BYTES,
    onError: (c) =>
      errorResponse(
        c,
        413,
        "PAYLOAD_TOO_LARGE",
        "Request body exceeds the allowed size",
      ),
  });
  const validateContentLength: MiddlewareHandler = async (c, next) => {
    const declared = c.req.header("content-length");
    if (declared !== undefined && !/^\d+$/.test(declared)) {
      return errorResponse(
        c,
        400,
        "INVALID_ARGUMENT",
        "Request could not be validated",
      );
    }
    if (declared !== undefined && Number(declared) > MAX_BODY_BYTES) {
      return errorResponse(
        c,
        413,
        "PAYLOAD_TOO_LARGE",
        "Request body exceeds the allowed size",
      );
    }
    await next();
  };
  const withStore = async <T>(
    c: Context,
    operation: () => Promise<T>,
  ): Promise<T | Response> => {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof StoreInputError) return errorResponse(c, 400, "INVALID_ARGUMENT", "Request could not be validated");
      if (error instanceof StoreNotFoundError) return errorResponse(c, 404, "NOT_FOUND", "Record not found");
      if (error instanceof StoreQuotaError) return errorResponse(c, 409, "QUOTA_EXCEEDED", "A configured workspace storage limit has been reached");
      return errorResponse(
        c,
        503,
        "SERVICE_UNAVAILABLE",
        "The service is temporarily unavailable",
      );
    }
  };

  app.get(`${PREFIX}/health`, rateLimit("read"), async (c) => {
    const result = await withStore(c, () => store.ping());
    if (result instanceof Response) return result;
    return c.json({ data: { status: "ok" } });
  });

  app.get(`${PREFIX}/rules`, rateLimit("read"), (c) =>
    c.json({ data: listRuleCatalog() }),
  );

  app.get(`${PREFIX}/summary`, rateLimit("read"), async (c) => {
    const result = await withStore(c, () => store.summary());
    return result instanceof Response ? result : c.json({ data: result });
  });

  app.get(`${PREFIX}/analytics`, rateLimit("read"), async (c) => {
    if (new URL(c.req.url).search) throw new ValidationError();
    const result = await withStore(c, () => store.analytics());
    return result instanceof Response ? result : c.json({ data: result });
  });

  app.get(`${PREFIX}/operations`, rateLimit("read"), async (c) => {
    if (new URL(c.req.url).search) throw new ValidationError();
    const result = await withStore(c, () => store.operations());
    return result instanceof Response ? result : c.json({ data: result });
  });

  app.get(`${PREFIX}/audit`, rateLimit("read"), async (c) => {
    if (new URL(c.req.url).search) throw new ValidationError();
    const result = await withStore(c, () => store.listAudit(100));
    return result instanceof Response ? result : c.json({ data: result });
  });

  app.get(`${PREFIX}/events`, rateLimit("read"), async (c) => {
    const query = parseEventQuery(new URL(c.req.url).searchParams);
    const result = await withStore(c, () => store.listEvents(query));
    return result instanceof Response
      ? result
      : c.json({ data: result.data, page: { nextCursor: result.nextCursor } });
  });

  app.post(
    `${PREFIX}/events`,
    sameOriginMutation,
    rateLimit("ingest"),
    validateContentLength,
    bodyLimitMiddleware,
    async (c) => {
      const body = await parseJson(c);
      const events = parseEventBatch(body);
      const matches = events.map((event: EventInput) => evaluateEvent(event));
      const result = await withStore(c, () => store.ingest(events, matches));
      return result instanceof Response
        ? result
        : c.json({ data: result }, 202);
    },
  );

  app.get(`${PREFIX}/findings`, rateLimit("read"), async (c) => {
    if (new URL(c.req.url).search) throw new ValidationError();
    const result = await withStore(c, () => store.listFindings(100));
    return result instanceof Response ? result : c.json({ data: result });
  });

  app.get(`${PREFIX}/cases`, rateLimit("read"), async (c) => {
    if (new URL(c.req.url).search) throw new ValidationError();
    const result = await withStore(c, () => store.listCases(100));
    return result instanceof Response ? result : c.json({ data: result });
  });

  app.post(
    `${PREFIX}/cases`,
    sameOriginMutation,
    rateLimit("case-write"),
    validateContentLength,
    bodyLimitMiddleware,
    async (c) => {
      const input = parseCaseCreate(await parseJson(c));
      const result = await withStore(c, () => store.createCase(input));
      return result instanceof Response
        ? result
        : c.json({ data: result }, 201);
    },
  );

  app.patch(
    `${PREFIX}/cases/:id`,
    sameOriginMutation,
    rateLimit("case-write"),
    validateContentLength,
    bodyLimitMiddleware,
    async (c) => {
      const id = c.req.param("id");
      if (!isUuid(id)) throw new ValidationError();
      const patch = parseCasePatch(await parseJson(c));
      const result = await withStore(c, () => store.updateCase(id, patch));
      if (result instanceof Response) return result;
      return result
        ? c.json({ data: result })
        : errorResponse(c, 404, "NOT_FOUND", "Case not found");
    },
  );

  app.all(PREFIX, (c) =>
    errorResponse(c, 404, "NOT_FOUND", "API route not found"),
  );
  app.all(`${PREFIX}/*`, (c) => {
    const path = new URL(c.req.url).pathname;
    const known =
      path === `${PREFIX}/health` ||
      path === `${PREFIX}/summary` ||
      path === `${PREFIX}/rules` ||
      path === `${PREFIX}/analytics` ||
      path === `${PREFIX}/operations` ||
      path === `${PREFIX}/audit` ||
      path === `${PREFIX}/events` ||
      path === `${PREFIX}/findings` ||
      path === `${PREFIX}/cases` ||
      new RegExp(`^${PREFIX}/cases/[^/]+$`).test(path);
    if (!known)
      return errorResponse(c, 404, "NOT_FOUND", "API route not found");
    c.header(
      "Allow",
      path === `${PREFIX}/events`
        ? "GET, HEAD, POST"
        : path === `${PREFIX}/cases`
          ? "GET, HEAD, POST"
          : path.startsWith(`${PREFIX}/cases/`)
            ? "PATCH"
            : "GET, HEAD",
    );
    return errorResponse(c, 405, "METHOD_NOT_ALLOWED", "Method not allowed");
  });

  app.notFound((c) =>
    errorResponse(c, 404, "NOT_FOUND", "API route not found"),
  );
  app.onError((error, c) => {
    const status =
      error instanceof ValidationError
        ? 400
        : error instanceof HTTPException &&
            (error.status === 400 || error.status === 401)
          ? error.status
          : 500;
    if (status === 400)
      return errorResponse(
        c,
        400,
        "INVALID_ARGUMENT",
        "Request could not be validated",
      );
    if (status === 401)
      return errorResponse(c, 401, "UNAUTHORIZED", "Authentication required");
    return errorResponse(
      c,
      500,
      "INTERNAL_ERROR",
      "The request could not be completed",
    );
  });

  return app;
}
