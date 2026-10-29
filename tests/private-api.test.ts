import assert from "node:assert/strict";
import test from "node:test";
import { serve } from '@hono/node-server';
import { execFile } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { connectionCheckBatch, connectionCommand } from '../src/features/site/connection-setup.ts';
import type {
  DataStore,
  DetectionMatch,
  EventInput,
  EventQuery,
  PageResult,
  OperationsStatus,
  AuditEntry,
  StoredCase,
  StoredEvent,
  StoredFinding,
  StoreSummary,
  WorkspaceAnalytics,
} from "../server/data-model.ts";
import { createPrivateApi } from "../server/private-api.ts";
import { StoreQuotaError } from "../server/storage/postgres-store.ts";

const TOKEN = "A".repeat(43);
const CASE_ID = "00000000-0000-4000-8000-000000000001";
const FINDING_ID = "00000000-0000-4000-8000-000000000002";
const validEvent: EventInput = {
  eventId: "fixture-event-1",
  timestamp: "2026-10-24T10:00:00Z",
  event: "Authentication failure observed",
  source: "synthetic-auth",
  host: "demo-host-1",
  severity: "medium",
  srcIp: "192.0.2.10",
  attributes: { category: "authentication", failureCount: 5 },
};
const createdCase: StoredCase = {
  id: CASE_ID,
  title: "Review synthetic alert",
  note: "Validate the source record.",
  status: "open",
  findingId: FINDING_ID,
  createdAt: "2026-10-24T10:00:00.000Z",
  updatedAt: "2026-10-24T10:00:00.000Z",
};

class FakeStore implements DataStore {
  calls = 0;
  fail = false;
  quota = false;
  ingested: EventInput[] = [];
  matches: DetectionMatch[][] = [];
  query: EventQuery | undefined;
  analyticsResult: WorkspaceAnalytics = {
    from: "2026-10-23T10:00:00.000Z",
    to: "2026-10-24T10:00:00.000Z",
    buckets: Array.from({ length: 24 }, (_, index) => ({
      timestamp: new Date(Date.parse("2026-10-23T10:00:00.000Z") + index * 3_600_000).toISOString(),
      count: index === 23 ? 2 : 0,
    })),
    sources: [{ source: "synthetic-auth", count: 2 }],
    severities: [
      { severity: "high", count: 0 },
      { severity: "medium", count: 2 },
      { severity: "low", count: 0 },
    ],
  };
  async ping() {
    this.calls += 1;
    if (this.fail) throw new Error("database secret");
  }
  async summary(): Promise<StoreSummary> {
    this.calls += 1;
    if (this.fail) throw new Error("database secret");
    return {
      eventCount: 8,
      findingCount: 2,
      openCaseCount: 1,
      latestEventAt: validEvent.timestamp,
    };
  }
  async analytics(): Promise<WorkspaceAnalytics> {
    this.calls += 1;
    if (this.fail) throw new Error("database secret");
    return this.analyticsResult;
  }
  async operations(): Promise<OperationsStatus> {
    this.calls += 1;
    if (this.fail) throw new Error("database secret");
    return {
      limits: { maxEvents: 1000, maxEventBytes: 2_000_000, maxCases: 100, maxAuditEntries: 200000, retentionDays: 30 },
      usage: { eventCount: 8, eventBytes: 4096, caseCount: 1, auditCount: 2 },
      retention: { cutoff: "2026-09-24T00:00:00.000Z", eligibleEvents: 2, heldEvents: 1 },
    };
  }
  async listAudit(limit: number): Promise<AuditEntry[]> {
    this.calls += 1;
    if (this.fail) throw new Error("database secret");
    assert.equal(limit, 100);
    return [];
  }
  async ingest(events: EventInput[], matches: DetectionMatch[][]) {
    this.calls += 1;
    if (this.fail) throw new Error("database secret");
    if (this.quota) throw new StoreQuotaError();
    this.ingested = events;
    this.matches = matches;
    return {
      accepted: events.length,
      duplicates: 0,
      findings: matches.flat().length,
    };
  }
  async listEvents(query: EventQuery): Promise<PageResult<StoredEvent>> {
    this.calls += 1;
    this.query = query;
    if (this.fail) throw new Error("database secret");
    return { data: [], nextCursor: null };
  }
  async listFindings(_limit: number): Promise<StoredFinding[]> {
    this.calls += 1;
    if (this.fail) throw new Error("database secret");
    return [];
  }
  async listCases(_limit: number): Promise<StoredCase[]> {
    this.calls += 1;
    if (this.fail) throw new Error("database secret");
    return [];
  }
  async createCase(input: {
    title: string;
    note: string;
    findingId?: string;
  }): Promise<StoredCase> {
    this.calls += 1;
    if (this.fail) throw new Error("database secret");
    return { ...createdCase, ...input, findingId: input.findingId ?? null };
  }
  async updateCase(
    _id: string,
    patch: { note?: string; status?: "open" | "closed" },
  ): Promise<StoredCase | null> {
    this.calls += 1;
    if (this.fail) throw new Error("database secret");
    return { ...createdCase, ...patch };
  }
  async close() {}
}

const apiFor = (store = new FakeStore(), token = TOKEN) => ({
  api: createPrivateApi({ store, token }),
  store,
});
const request = (path: string, init: RequestInit = {}) =>
  new Request(`http://localhost${path}`, init);
const auth = { authorization: `Bearer ${TOKEN}` };
const json = (value: unknown, extra: Record<string, string> = {}) => ({
  method: "POST",
  headers: { ...auth, "content-type": "application/json", ...extra },
  body: JSON.stringify(value),
});
test("requires a strong configured token and authenticates before store access", async () => {
  assert.throws(
    () =>
      createPrivateApi({ store: new FakeStore(), token: "development-token" }),
    /strong base64url service token/,
  );
  const { api, store } = apiFor();
  const missing = await api.fetch(request("/api/private/v1/health"));
  assert.equal(missing.status, 401);
  assert.deepEqual(await missing.json(), {
    error: { code: "UNAUTHORIZED", message: "Authentication required" },
  });
  assert.equal(store.calls, 0);
  const missingOperations = await api.fetch(request("/api/private/v1/operations"));
  assert.equal(missingOperations.status, 401);
  const missingAnalytics = await api.fetch(request("/api/private/v1/analytics"));
  assert.equal(missingAnalytics.status, 401);
  assert.equal(store.calls, 0);
  const inUrl = await api.fetch(
    request(`/api/private/v1/health?token=${TOKEN}`),
  );
  assert.equal(inUrl.status, 401);
  const urlCredential = await api.fetch(
    request(`/api/private/v1/health?token=${TOKEN}`, { headers: auth }),
  );
  assert.equal(urlCredential.status, 400);
  assert.equal(store.calls, 0);
  assert.equal(missing.headers.get("cache-control"), "no-store");
  assert.equal(missing.headers.get("x-content-type-options"), "nosniff");
  assert.equal(missing.headers.get("referrer-policy"), "no-referrer");
});

test("maps storage quota failures to a safe conflict response", async () => {
  const { api, store } = apiFor();
  store.quota = true;
  const response = await api.fetch(request("/api/private/v1/events", json({ events: [validEvent] })));
  assert.equal(response.status, 409);
  const body = await response.json();
  assert.deepEqual(body, {
    error: {
      code: "QUOTA_EXCEEDED",
      message: "A configured workspace storage limit has been reached",
    },
  });
  assert.equal(JSON.stringify(body).includes("Workspace quota exceeded"), false);
});

test("serves protected health, summary, analytics, operations, audit, events, findings, and cases in data envelopes", async () => {
  const { api, store } = apiFor();
  for (const path of [
    "/health",
    "/summary",
    "/analytics",
    "/operations",
    "/audit",
    "/events",
    "/findings",
    "/cases",
  ]) {
    const response = await api.fetch(
      request(`/api/private/v1${path}`, { headers: auth }),
    );
    assert.equal(response.status, 200, path);
    assert.ok("data" in (await response.json()), path);
  }
  assert.equal(store.calls, 8);
  assert.equal(
    store.query?.from && Date.parse(store.query.from) <= Date.now(),
    true,
  );
  assert.ok(store.query?.to);
});

test("operations and audit reject query strings and return safe store failures", async () => {
  const { api, store } = apiFor();
  for (const path of ["/operations?limit=1", "/audit?page=2", "/analytics?source=x"]) {
    const response = await api.fetch(request(`/api/private/v1${path}`, { headers: auth }));
    assert.equal(response.status, 400);
  }
  assert.equal(store.calls, 0);
  store.fail = true;
  for (const path of ["/operations", "/audit", "/analytics"]) {
    const response = await api.fetch(request(`/api/private/v1${path}`, { headers: auth }));
    assert.equal(response.status, 503);
    assert.equal(JSON.stringify(await response.json()).includes("database secret"), false);
  }
});

test("analytics rejects all client filters and returns a safe bounded failure", async () => {
  const { api, store } = apiFor();
  const response = await api.fetch(request("/api/private/v1/analytics", { headers: auth }));
  assert.equal(response.status, 200);
  const body = (await response.json()) as { data: WorkspaceAnalytics };
  assert.deepEqual(body.data, store.analyticsResult);
  assert.equal(body.data.buckets.length, 24);
  assert.deepEqual(body.data.severities.map(({ severity }) => severity), ["high", "medium", "low"]);
  for (const query of ["source=synthetic-auth", "from=2026-10-01T00%3A00%3A00Z", "workspaceId=foreign", "limit=1"]) {
    const invalid = await api.fetch(request(`/api/private/v1/analytics?${query}`, { headers: auth }));
    assert.equal(invalid.status, 400, query);
  }
  assert.equal(store.calls, 1);
  store.fail = true;
  const failed = await api.fetch(request("/api/private/v1/analytics", { headers: auth }));
  assert.equal(failed.status, 503);
  assert.equal(JSON.stringify(await failed.json()).includes("database secret"), false);
});

test("event query validation rejects unknown, repeated, malformed, and oversized inputs", async () => {
  const { api, store } = apiFor();
  for (const query of [
    "workspace=other",
    "q=a&q=b",
    "limit=101",
    "from=2026-02-30T00%3A00%3A00Z",
    "from=2026-01-01T00%3A00%3A00Z&to=2026-02-02T00%3A00%3A01Z",
    `cursor=${"a".repeat(257)}`,
  ]) {
    const response = await api.fetch(
      request(`/api/private/v1/events?${query}`, { headers: auth }),
    );
    assert.equal(response.status, 400, query);
    assert.deepEqual(await response.json(), {
      error: {
        code: "INVALID_ARGUMENT",
        message: "Request could not be validated",
      },
    });
  }
  assert.equal(store.calls, 0);
  const valid = await api.fetch(
    request("/api/private/v1/events?severity=MEDIUM&limit=2", {
      headers: auth,
    }),
  );
  assert.equal(valid.status, 200);
  assert.equal(store.query?.severity, "medium");
  assert.equal(store.query?.limit, 2);
});

test("validates event batches strictly and evaluates detections before ingestion", async () => {
  const { api, store } = apiFor();
  const response = await api.fetch(
    request("/api/private/v1/events", json({ events: [validEvent] })),
  );
  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), {
    data: { accepted: 1, duplicates: 0, findings: 1 },
  });
  assert.equal(store.ingested.length, 1);
  assert.equal(store.ingested[0].timestamp, "2026-10-24T10:00:00.000Z");
  assert.equal(store.matches[0].length, 1);
  for (const event of [
    { ...validEvent, workspaceId: "other" },
    { ...validEvent, timestamp: "2026-02-30T00:00:00Z" },
    { ...validEvent, srcIp: "999.1.1.1" },
    { ...validEvent, attributes: { nested: { key: "value" } } },
    { ...validEvent, raw: "x".repeat(16_385) },
    { ...validEvent, raw: "界".repeat(11_000) },
    { ...validEvent, attributes: Object.fromEntries(Array.from({length:32},(_,i)=>["field"+i,"x".repeat(1024)])) },
  ]) {
    const invalid = await api.fetch(
      request("/api/private/v1/events", json({ events: [event] })),
    );
    assert.equal(invalid.status, 400);
  }
  const foreign = await api.fetch(
    request(
      "/api/private/v1/events",
      json({ events: [validEvent] }, { origin: "https://elsewhere.example" }),
    ),
  );
  assert.equal(foreign.status, 403);
  const malformed = await api.fetch(
    request("/api/private/v1/events", {
      method: "POST",
      headers: { ...auth, "content-type": "application/json" },
      body: "{",
    }),
  );
  assert.equal(malformed.status, 400);
  assert.equal(store.calls, 1);
});

test("caps chunked request bodies before JSON parsing", async () => {
  const { api, store } = apiFor();
  const bytes = new Uint8Array(256 * 1024 + 1).fill(32);
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
  const response = await api.fetch(
    new Request("http://localhost/api/private/v1/events", {
      method: "POST",
      headers: { ...auth, "content-type": "application/json" },
      body,
      duplex: "half",
    } as RequestInit & { duplex: "half" }),
  );
  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), {
    error: {
      code: "PAYLOAD_TOO_LARGE",
      message: "Request body exceeds the allowed size",
    },
  });
  assert.equal(store.calls, 0);
  const malformedLength = await api.fetch(
    request("/api/private/v1/events", {
      method: "POST",
      headers: {
        ...auth,
        "content-type": "application/json",
        "content-length": "invalid",
      },
      body: "{}",
    }),
  );
  assert.equal(malformedLength.status, 400);
  assert.equal(store.calls, 0);
});

test("creates and patches UUID cases; rejects extra client workspace fields", async () => {
  const { api, store } = apiFor();
  const created = await api.fetch(
    request(
      "/api/private/v1/cases",
      json({ title: "Review", note: "Synthetic only", findingId: FINDING_ID }),
    ),
  );
  assert.equal(created.status, 201);
  assert.equal(
    ((await created.json()) as { data: StoredCase }).data.id,
    CASE_ID,
  );
  const patched = await api.fetch(
    request(`/api/private/v1/cases/${CASE_ID}`, {
      ...json({ note: "Checked", status: "closed" }),
      method: "PATCH",
    }),
  );
  assert.equal(patched.status, 200);
  assert.deepEqual(((await patched.json()) as { data: StoredCase }).data, {
    ...createdCase,
    note: "Checked",
    status: "closed",
  });
  for (const body of [
    { title: "x", note: "y", workspaceId: "foreign" },
    { title: "x", note: "y", findingId: "not-uuid" },
  ]) {
    const invalid = await api.fetch(
      request("/api/private/v1/cases", json(body)),
    );
    assert.equal(invalid.status, 400);
  }
  assert.equal(store.calls, 2);
});

test("uses safe 503 envelopes and rejects unsupported methods and missing case IDs", async () => {
  const store = new FakeStore();
  store.fail = true;
  const { api } = apiFor(store);
  const failed = await api.fetch(
    request("/api/private/v1/summary", { headers: auth }),
  );
  assert.equal(failed.status, 503);
  const failedBody = await failed.json();
  assert.deepEqual(failedBody, {
    error: {
      code: "SERVICE_UNAVAILABLE",
      message: "The service is temporarily unavailable",
    },
  });
  assert.equal(JSON.stringify(failedBody).includes("database secret"), false);
  const method = await api.fetch(
    request("/api/private/v1/events", { method: "DELETE", headers: auth }),
  );
  assert.equal(method.status, 405);
  assert.equal(method.headers.get("allow"), "GET, HEAD, POST");
  const unknown = await api.fetch(
    request("/api/private/v1/events/not-a-route", { headers: auth }),
  );
  assert.equal(unknown.status, 404);
  const id = await api.fetch(
    request("/api/private/v1/cases/not-a-uuid", {
      ...json({ status: "closed" }),
      method: "PATCH",
    }),
  );
  assert.equal(id.status, 400);
});

test("applies separate in-process read and ingest rate limits", async () => {
  const { api, store } = apiFor();
  let last: Response | undefined;
  for (let index = 0; index < 61; index += 1)
    last = await api.fetch(
      request("/api/private/v1/summary", { headers: auth }),
    );
  assert.equal(last?.status, 429);
  assert.ok(last?.headers.has("retry-after"));
  assert.equal(store.calls, 60);

  const ingestApi = apiFor().api;
  const body = json({ events: [validEvent] });
  for (let index = 0; index < 10; index += 1)
    await ingestApi.fetch(request("/api/private/v1/events", body));
  const limited = await ingestApi.fetch(
    request("/api/private/v1/events", body),
  );
  assert.equal(limited.status, 429);
  assert.ok(limited.headers.has("retry-after"));

  const caseApi = apiFor().api;
  const caseBody = json({ title: "Review", note: "Synthetic" });
  for (let index = 0; index < 10; index += 1)
    await caseApi.fetch(request("/api/private/v1/cases", caseBody));
  const caseLimit = await caseApi.fetch(
    request("/api/private/v1/cases", caseBody),
  );
  assert.equal(caseLimit.status, 429);
});

 test("case note may be empty and storage input errors are safe client failures",async()=>{
  const {api,store}=apiFor();
  assert.equal((await api.fetch(request("/api/private/v1/cases",json({title:"Synthetic",note:""})))).status,201);
  const {StoreInputError,StoreNotFoundError}=await import("../server/storage/postgres-store.js");
  store.listEvents=async()=>{throw new StoreInputError("private detail")};
  const invalid=await api.fetch(request("/api/private/v1/events",{headers:auth}));
  assert.equal(invalid.status,400);
  assert.ok(!(await invalid.text()).includes("private detail"));
  store.createCase=async()=>{throw new StoreNotFoundError("private detail")};
  assert.equal((await api.fetch(request("/api/private/v1/cases",json({title:"Synthetic",note:""})))).status,404);
});

test("rule catalog is authenticated, bounded, non-executable, uncached, and rejects caller scope", async () => {
  const { api, store } = apiFor();
  for (const headers of [{} as Record<string, string>, { authorization: "Bearer invalid" }]) {
    assert.equal((await api.fetch(request("/api/private/v1/rules", { headers }))).status, 401);
  }
  for (const query of ["?workspace=other", "?token=secret", "?limit=1"]) {
    assert.equal((await api.fetch(request(`/api/private/v1/rules${query}`, { headers: auth }))).status, 400);
  }
  const mutation = await api.fetch(request("/api/private/v1/rules", { method: "POST", headers: auth }));
  assert.equal(mutation.status, 405);
  assert.equal(mutation.headers.get("allow"), "GET, HEAD");
  const response = await api.fetch(request("/api/private/v1/rules", { headers: auth }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const { data } = await response.json();
  assert.equal(data.length, 6);
  assert.ok(data.every((rule: Record<string, unknown>) => rule.version === "1.0.0" && !("matches" in rule)));
  assert.equal(store.calls, 0);
  for (let index = 0; index < 59; index++) await api.fetch(request("/api/private/v1/rules", { headers: auth }));
  assert.equal((await api.fetch(request("/api/private/v1/rules", { headers: auth }))).status, 429);
});

test('public setup commands authenticate and ingest their downloaded sample over the real HTTP interface', async () => {
  const { api, store } = apiFor();
  const directory = await mkdtemp(join(tmpdir(), 'sentinel-connection-check-'));
  const server = serve({ fetch: api.fetch, hostname: '127.0.0.1', port: 0 });
  const execute = (command: string) => new Promise<string>((resolve, reject) => {
    const child = execFile('bash', ['-c', command], { cwd: directory, timeout: 5000, maxBuffer: 16_384 }, (error, stdout, stderr) => {
      if (error) { reject(new Error('Generated connection command failed')); return; }
      assert.equal(stderr.includes(TOKEN), false);
      resolve(stdout.trim());
    });
    child.stdin?.end(TOKEN + '\n');
  });
  try {
    if (!server.listening) await new Promise<void>(resolve => server.once('listening', resolve));
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const origin = `http://127.0.0.1:${address.port}`;
    assert.deepEqual(JSON.parse(await execute(connectionCommand(origin, 'health'))), { data: { status: 'ok' } });
    const sample = connectionCheckBatch();
    await writeFile(join(directory, 'sentinel-connection-check.json'), JSON.stringify(sample), { mode: 0o600 });
    const result = JSON.parse(await execute(connectionCommand(origin, 'ingest')));
    assert.equal(result.data.accepted, 1);
    assert.equal(store.ingested[0].eventId, sample.events[0].eventId);
    assert.equal(store.ingested[0].attributes?.synthetic, true);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await rm(directory, { recursive: true, force: true });
  }
});

test('injected durable budgets replace local counters and return a bounded wait', async () => {
  const store = new FakeStore();
  let allowed = true;
  const kinds: string[] = [];
  const app = createPrivateApi({ store, token: TOKEN, consumeBudget: async (kind) => {
    kinds.push(kind);
    return { allowed, retryAfterSeconds: 17 };
  } });
  const request = () => app.request('/api/private/v1/rules', { headers: { Authorization: `Bearer ${TOKEN}` } });
  for (let index=0; index<65; index++) assert.equal((await request()).status, 200);
  allowed = false;
  const denied = await request();
  assert.equal(denied.status, 429);
  assert.equal(denied.headers.get('retry-after'), '17');
  assert.equal(denied.headers.get('cache-control'), 'no-store');
  assert.ok(kinds.every(kind=>kind==='read'));
});

test('budget failures deny data operations rather than falling back to memory', async () => {
  const store = new FakeStore();
  const app = createPrivateApi({ store, token: TOKEN, consumeBudget: async () => { throw new Error('Synthetic budget outage'); } });
  const response = await app.request('/api/private/v1/summary', { headers: { Authorization: `Bearer ${TOKEN}` } });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, 'BUDGET_UNAVAILABLE');
  assert.equal(store.calls, 0);
});
