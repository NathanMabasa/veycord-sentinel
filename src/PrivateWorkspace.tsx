import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertTriangle,
  Check,
  CircleAlert,
  CircleCheck,
  ChevronDown,
  Database,
  LockKeyhole,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import type {
  StoredCase,
  StoredEvent,
  StoredFinding,
  StoreSummary,
  OperationsStatus,
  AuditEntry,
  WorkspaceAnalytics,
} from "../server/data-model";
import { createPrivateSamples } from "./data/private-samples";
import "./private-workspace.css";

const API_BASE = "/api/private/v1";
const severities = ["high", "medium", "low"] as const;
type ApiPage<T> = { data: T[]; page?: { nextCursor: string | null } };
type ApiData<T> = { data: T };
type Filters = { q: string; source: string; severity: string; hours: number };
type EventPage = { data: StoredEvent[]; page?: { nextCursor: string | null } };
type EventRange = { from: string; to: string };

class PrivateApiError extends Error {
  status: number;
  retryAfterSeconds?: number;

  constructor(status: number, message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = "PrivateApiError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function messageFor(error: unknown) {
  if (error instanceof PrivateApiError) {
    if (error.status === 401 || error.status === 403) {
      return "Your access was not accepted. Sign in again or check the operator service key.";
    }
    if (error.status === 429) {
      return error.retryAfterSeconds ? `Request limit reached. Wait ${error.retryAfterSeconds} ${error.retryAfterSeconds === 1 ? "second" : "seconds"}, then try again.` : "Request limit reached. Wait a minute, then try again.";
    }
    if (error.status === 404) {
      return "The private workspace API is not available at this address. Start the local service or check its configuration.";
    }
    if (error.status === 409) {
      return "The workspace reached a configured storage limit. Review Operations for current usage and retention eligibility, then ask the local operator to adjust limits or retention before retrying.";
    }
    if (error.status === 503) {
      return "The private workspace service is temporarily unavailable. Check that its database is configured and reachable.";
    }
    if (error.status === 400 || error.status === 422) {
      return "The service rejected this request. Review the values and try again.";
    }
    return "The private workspace request could not be completed. Try again or check the local service.";
  }
  return "Could not reach the private workspace service. Check that it is running.";
}

async function fetchWorkspace<T>(
  path: string,
  key: string,
  signal: AbortSignal,
  init?: RequestInit,
  sessionMode = false,
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (!sessionMode) headers.set("Authorization", `Bearer ${key}`);
  if (init?.body) headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(`${sessionMode ? "/api/workspace/v1" : API_BASE}${path}`, {
      ...init,
      headers,
      signal,
      cache: "no-store",
      credentials: sessionMode ? "same-origin" : "omit",
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new PrivateApiError(0, "Network request failed");
  }
  if (!response.ok) {
    const header = response.headers.get("Retry-After") ?? "";
    const retryAfter = /^\d{1,2}$/.test(header) && Number(header) >= 1 && Number(header) <= 60 ? Number(header) : undefined;
    // Release unread error bodies before surfacing the status to the UI.
    await response.body?.cancel().catch(() => {});
    throw new PrivateApiError(response.status, "Request failed", retryAfter);
  }
  try {
    return (await response.json()) as T;
  } catch {
    throw new PrivateApiError(502, "Invalid service response");
  }
}

function isoDate(value: string | null) {
  if (!value) return "No events recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unknown"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function utcDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unknown"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(date);
}

function utcHour(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unknown"
    : new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
      }).format(date);
}

function severityLabel(value: string) {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

export default function PrivateWorkspace({ sessionAccess }: { sessionAccess?: { name: string; role: 'admin' | 'analyst' | 'viewer' } } = {}) {
  const sessionMode = Boolean(sessionAccess);
  const administrator = !sessionAccess || sessionAccess.role === 'admin';
  const canWrite = !sessionAccess || sessionAccess.role !== 'viewer';
  const requestJson = useCallback(<T,>(path:string,key:string,signal:AbortSignal,init?:RequestInit) => fetchWorkspace<T>(path,key,signal,init,sessionMode),[sessionMode]);
  const [keyDraft, setKeyDraft] = useState("");
  // Non-secret mode marker; session requests never attach this value as a credential.
  const [serviceKey, setServiceKey] = useState(sessionMode ? "cookie-session" : "");
  const [summary, setSummary] = useState<StoreSummary | null>(null);
  const [operations, setOperations] = useState<OperationsStatus | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [analytics, setAnalytics] = useState<WorkspaceAnalytics | null>(null);
  const [analyticsError, setAnalyticsError] = useState(false);
  const [events, setEvents] = useState<StoredEvent[]>([]);
  const [eventsCursor, setEventsCursor] = useState<string | null>(null);
  const [findings, setFindings] = useState<StoredFinding[]>([]);
  const [cases, setCases] = useState<StoredCase[]>([]);
  const [caseNotes, setCaseNotes] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState<Filters>({ q: "", source: "", severity: "", hours: 24 });
  const [queryDraft, setQueryDraft] = useState("");
  const [sourceDraft, setSourceDraft] = useState("");
  const [severityDraft, setSeverityDraft] = useState("");
  const [hoursDraft, setHoursDraft] = useState("24");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<StoredEvent | null>(null);
  const [caseFinding, setCaseFinding] = useState<StoredFinding | null>(null);
  const [caseTitle, setCaseTitle] = useState("");
  const [caseNote, setCaseNote] = useState("");
  const requestRef = useRef<AbortController | null>(null);
  const sequenceRef = useRef(0);
  const eventRangeRef = useRef<EventRange | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const caseDialogRef = useRef<HTMLDialogElement>(null);
  const connected = serviceKey.length > 0;

  const cancelRequest = useCallback(() => {
    requestRef.current?.abort();
    requestRef.current = null;
    sequenceRef.current += 1;
  }, []);

  useEffect(() => () => cancelRequest(), [cancelRequest]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (selectedEvent && !dialog.open) dialog.showModal();
    else if (!selectedEvent && dialog.open) dialog.close();
  }, [selectedEvent]);

  useEffect(() => {
    const dialog = caseDialogRef.current;
    if (!dialog) return;
    if (caseFinding && !dialog.open) dialog.showModal();
    else if (!caseFinding && dialog.open) dialog.close();
  }, [caseFinding]);

  const loadEvents = useCallback(
    async (
      key: string,
      activeFilters: Filters,
      signal: AbortSignal,
      range: EventRange,
      cursor?: string | null,
    ) => {
      const params = new URLSearchParams({
        limit: "50",
        from: range.from,
        to: range.to,
      });
      if (activeFilters.q.trim()) params.set("q", activeFilters.q.trim());
      if (activeFilters.source) params.set("source", activeFilters.source);
      if (activeFilters.severity) params.set("severity", activeFilters.severity);
      if (cursor) params.set("cursor", cursor);
      const result = await requestJson<EventPage>(
        `/events?${params.toString()}`,
        key,
        signal,
      );
      return {
        events: Array.isArray(result.data) ? result.data.slice(0, 50) : [],
        nextCursor: result.page?.nextCursor ?? null,
      };
    },
    [],
  );

  const refreshWorkspace = useCallback(
    async (key: string, activeFilters = filters) => {
      cancelRequest();
      const controller = new AbortController();
      requestRef.current = controller;
      const sequence = sequenceRef.current;
      const range = {
        from: new Date(Date.now() - activeFilters.hours * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString(),
      };
      eventRangeRef.current = range;
      setPending("refresh");
      setError("");
      try {
        const analyticsRequest = requestJson<ApiData<WorkspaceAnalytics>>("/analytics", key, controller.signal).catch(() => null);
        const [nextSummary, eventPage, nextFindings, nextCases, nextOperations, nextAudit, nextAnalytics] = await Promise.all([
          requestJson<ApiData<StoreSummary>>("/summary", key, controller.signal),
          loadEvents(key, activeFilters, controller.signal, range),
          requestJson<ApiPage<StoredFinding>>("/findings", key, controller.signal),
          requestJson<ApiPage<StoredCase>>("/cases", key, controller.signal),
          administrator ? requestJson<ApiData<OperationsStatus>>("/operations", key, controller.signal) : Promise.resolve({data:null}),
          administrator ? requestJson<ApiPage<AuditEntry>>("/audit", key, controller.signal) : Promise.resolve({data:[]}),
          analyticsRequest,
        ]);
        if (sequenceRef.current !== sequence) return;
        setSummary(nextSummary.data);
        setOperations(nextOperations.data);
        setAudit(Array.isArray(nextAudit.data) ? nextAudit.data.slice(0, 100) : []);
        setAnalytics(nextAnalytics?.data ?? null);
        setAnalyticsError(nextAnalytics === null);
        setEvents(eventPage.events);
        setEventsCursor(eventPage.nextCursor);
        setFindings(Array.isArray(nextFindings.data) ? nextFindings.data.slice(0, 100) : []);
        const nextCaseList = Array.isArray(nextCases.data) ? nextCases.data.slice(0, 100) : [];
        setCases(nextCaseList);
        setCaseNotes((current) => Object.fromEntries(nextCaseList.map((item) => [item.id, current[item.id] ?? item.note])));
      } catch (caught) {
        if (!controller.signal.aborted && sequenceRef.current === sequence) {
          reportFailure(caught);
        }
      } finally {
        if (sequenceRef.current === sequence) setPending(null);
      }
    },
    [cancelRequest, filters, loadEvents, requestJson, administrator],
  );

  const sessionRefresh = useRef(refreshWorkspace);
  sessionRefresh.current = refreshWorkspace;
  useEffect(() => {
    if(sessionMode) void sessionRefresh.current("cookie-session");
  },[sessionMode]);

  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const key = keyDraft.trim();
    if (!key) {
      setError("Enter the local service key to connect.");
      return;
    }
    cancelRequest();
    const controller = new AbortController();
    requestRef.current = controller;
    const sequence = sequenceRef.current;
    setPending("connect");
    setError("");
    setNotice("");
    try {
      const result = await requestJson<ApiData<StoreSummary>>(
        "/summary",
        key,
        controller.signal,
      );
      if (sequenceRef.current !== sequence) return;
      setServiceKey(key);
      setKeyDraft("");
      setSummary(result.data);
      setNotice("Connected to the configured local data store.");
      await refreshWorkspace(key, filters);
    } catch (caught) {
      if (!controller.signal.aborted && sequenceRef.current === sequence) {
        reportFailure(caught);
      }
    } finally {
      if (sequenceRef.current === sequence) setPending(null);
    }
  }

  function disconnect() {
    cancelRequest();
    setServiceKey("");
    setKeyDraft("");
    setSummary(null);
    setOperations(null);
    setAudit([]);
    setAnalytics(null);
    setAnalyticsError(false);
    setEvents([]);
    setEventsCursor(null);
    setFindings([]);
    setCases([]);
    setCaseNotes({});
    setSelectedEvent(null);
    setCaseFinding(null);
    setPending(null);
    setError("");
    setNotice("Disconnected. The key and workspace data were cleared from this page.");
  }

  function reportFailure(caught: unknown) {
    if (caught instanceof PrivateApiError && (caught.status === 401 || caught.status === 403)) {
      cancelRequest();
      setServiceKey("");
      setKeyDraft("");
      setSummary(null);
      setOperations(null);
      setAudit([]);
      setAnalytics(null);
      setAnalyticsError(false);
      setEvents([]);
      setEventsCursor(null);
      setFindings([]);
      setCases([]);
      setCaseNotes({});
      setSelectedEvent(null);
      setCaseFinding(null);
      setPending(null);
    }
    setError(messageFor(caught));
  }

  async function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = {
      q: queryDraft,
      source: sourceDraft,
      severity: severityDraft,
      hours: Number(hoursDraft),
    };
    if (![1,24,168,720].includes(next.hours)) { setError("Choose a supported event time range."); return; }
    if (!serviceKey) return;
    cancelRequest();
    const controller = new AbortController();
    requestRef.current = controller;
    const sequence = sequenceRef.current;
    const now = Date.now();
    const range = { from: new Date(now - next.hours * 60 * 60 * 1000).toISOString(), to: new Date(now).toISOString() };
    setPending("events");
    setError("");
    try {
      const page = await loadEvents(serviceKey, next, controller.signal, range);
      if (sequenceRef.current !== sequence) return;
      eventRangeRef.current = range;
      setFilters(next);
      setEvents(page.events);
      setEventsCursor(page.nextCursor);
    } catch (caught) {
      if (!controller.signal.aborted && sequenceRef.current === sequence) reportFailure(caught);
    } finally {
      if (sequenceRef.current === sequence) setPending(null);
    }
  }

  async function loadMoreEvents() {
    if (!serviceKey || !eventsCursor) return;
    cancelRequest();
    const controller = new AbortController();
    requestRef.current = controller;
    const sequence = sequenceRef.current;
    setPending("events-more");
    setError("");
    try {
      const range = eventRangeRef.current;
      if (!range) return;
      const page = await loadEvents(serviceKey, filters, controller.signal, range, eventsCursor);
      if (sequenceRef.current !== sequence) return;
      setEvents((current) => [...current, ...page.events.filter((item) => !current.some((existing) => existing.id === item.id))]);
      setEventsCursor(page.nextCursor);
    } catch (caught) {
      if (!controller.signal.aborted && sequenceRef.current === sequence) reportFailure(caught);
    } finally {
      if (sequenceRef.current === sequence) setPending(null);
    }
  }

  async function addSyntheticSamples() {
    if (!serviceKey) return;
    cancelRequest();
    const controller = new AbortController();
    requestRef.current = controller;
    const sequence = sequenceRef.current;
    setPending("samples");
    setError("");
    setNotice("");
    const payload = createPrivateSamples();
    try {
      const result = await requestJson<ApiData<{ accepted: number; duplicates: number; findings: number }>>(
        "/events",
        serviceKey,
        controller.signal,
        { method: "POST", body: JSON.stringify({ events: payload }) },
      );
      if (sequenceRef.current !== sequence) return;
      const accepted = result.data?.accepted ?? 0;
      const duplicates = result.data?.duplicates ?? 0;
      setNotice(`Synthetic sample request complete: ${accepted} accepted, ${result.data?.findings ?? 0} findings created, ${duplicates} duplicates.`);
      await refreshWorkspace(serviceKey, filters);
    } catch (caught) {
      if (!controller.signal.aborted && sequenceRef.current === sequence) {
        reportFailure(caught);
      }
    } finally {
      if (sequenceRef.current === sequence) setPending(null);
    }
  }

  async function createCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!serviceKey || !caseFinding) return;
    const title = caseTitle.trim();
    if (!title) return;
    cancelRequest();
    const controller = new AbortController();
    requestRef.current = controller;
    const sequence = sequenceRef.current;
    setPending("create-case");
    setError("");
    try {
      await requestJson<ApiData<StoredCase>>("/cases", serviceKey, controller.signal, {
        method: "POST",
        body: JSON.stringify({ title, note: caseNote.trim(), findingId: caseFinding.id }),
      });
      if (sequenceRef.current !== sequence) return;
      setCaseFinding(null);
      setCaseTitle("");
      setCaseNote("");
      setNotice("Case created and linked to the finding.");
      await refreshWorkspace(serviceKey, filters);
    } catch (caught) {
      if (!controller.signal.aborted && sequenceRef.current === sequence) {
        reportFailure(caught);
      }
    } finally {
      if (sequenceRef.current === sequence) setPending(null);
    }
  }

  async function updateCase(item: StoredCase, status = item.status) {
    if (!serviceKey) return;
    cancelRequest();
    const controller = new AbortController();
    requestRef.current = controller;
    const sequence = sequenceRef.current;
    setPending(`case:${item.id}`);
    setError("");
    try {
      const result = await requestJson<ApiData<StoredCase>>(
        `/cases/${encodeURIComponent(item.id)}`,
        serviceKey,
        controller.signal,
        {
          method: "PATCH",
          body: JSON.stringify({ note: caseNotes[item.id] ?? item.note, status }),
        },
      );
      if (sequenceRef.current !== sequence) return;
      const updated = result.data;
      setCases((items) => items.map((current) => (current.id === updated.id ? updated : current)));
      setCaseNotes((notes) => ({ ...notes, [updated.id]: updated.note }));
      if (item.status !== updated.status) {
        setSummary((current) => current ? {
          ...current,
          openCaseCount: Math.max(0, current.openCaseCount + (updated.status === "open" ? 1 : -1)),
        } : current);
      }
      setNotice(status === item.status ? "Case notes saved." : `Case ${status}.`);
      void refreshOperationsAndAudit(serviceKey);
    } catch (caught) {
      if (!controller.signal.aborted && sequenceRef.current === sequence) {
        reportFailure(caught);
      }
    } finally {
      if (sequenceRef.current === sequence) setPending(null);
    }
  }

  async function refreshOperationsAndAudit(key: string) {
    if (!administrator) return;
    const controller = new AbortController();
    const sequence = sequenceRef.current;
    try {
      const [nextOperations, nextAudit] = await Promise.all([
        administrator ? requestJson<ApiData<OperationsStatus>>("/operations", key, controller.signal) : Promise.resolve({data:null}),
        administrator ? requestJson<ApiPage<AuditEntry>>("/audit", key, controller.signal) : Promise.resolve({data:[]}),
      ]);
      if (sequenceRef.current !== sequence || serviceKey !== key) return;
      setOperations(nextOperations.data);
      setAudit(Array.isArray(nextAudit.data) ? nextAudit.data.slice(0, 100) : []);
      const nextAnalytics = await requestJson<ApiData<WorkspaceAnalytics>>("/analytics", key, controller.signal);
      if (sequenceRef.current !== sequence || serviceKey !== key) return;
      setAnalytics(nextAnalytics.data);
      setAnalyticsError(false);
    } catch (caught) {
      if (sequenceRef.current === sequence && serviceKey === key) {
        setAnalyticsError(true);
        reportFailure(caught);
      }
    }
  }

  const sources = useMemo(
    () => [...new Set(events.map((event) => event.source))].sort(),
    [events],
  );
  const activityMax = Math.max(1, ...(analytics?.buckets.map((bucket) => bucket.count) ?? []));
  const hasActivity = (analytics?.buckets.some((bucket) => bucket.count > 0) ?? false);

  return (
    <section className="private-workspace" aria-label="Private investigation workspace">
      <header className="private-workspace__header">
        <div className={`private-workspace__connection ${connected ? "is-connected" : ""}`}>
          {connected ? <CircleCheck size={18} aria-hidden="true" /> : <Database size={18} aria-hidden="true" />}
          <span>{connected ? "Local service connected" : "Not connected"}</span>
        </div>
      </header>

      <section className="private-workspace__connect" hidden={sessionMode} aria-labelledby="private-connect-title">
        <div className="private-workspace__connect-copy">
          <span className="private-workspace__icon"><LockKeyhole size={19} /></span>
          <div>
            <h2 id="private-connect-title">{connected ? "Workspace connection" : "Connect to your local service"}</h2>
            <p>
              The key stays in this page’s memory and is cleared when you disconnect or leave.
              It is not saved in browser storage or added to the address.
            </p>
          </div>
        </div>
        {!connected ? (
          <form className="private-workspace__key-form" onSubmit={connect}>
            <label htmlFor="private-service-key">Service key</label>
            <div className="private-workspace__key-controls">
              <input
                id="private-service-key"
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={keyDraft}
                onChange={(event) => setKeyDraft(event.target.value)}
                placeholder="Enter the key from your local setup"
                aria-describedby="private-key-help"
              />
              <button className="private-workspace__button is-primary" type="submit" disabled={pending === "connect"}>
                {pending === "connect" ? <RefreshCw className="is-spinning" size={16} /> : <ShieldCheck size={16} />}
                {pending === "connect" ? "Connecting…" : "Connect"}
              </button>
            </div>
            <span id="private-key-help" className="private-workspace__hint">
              A service key is configured by the local operator; it is never displayed again after connecting.
            </span>
          </form>
        ) : (
          <div className="private-workspace__connected-actions">
            <button
              className="private-workspace__button is-secondary"
              type="button"
              onClick={() => void refreshWorkspace(serviceKey)}
              disabled={pending !== null}
            >
              <RefreshCw size={16} className={pending === "refresh" ? "is-spinning" : ""} />
              Refresh data
            </button>
            <button className="private-workspace__button is-quiet" type="button" onClick={disconnect}>
              <X size={16} /> Disconnect
            </button>
          </div>
        )}
      </section>

      <div className="private-workspace__status" aria-live="polite" aria-atomic="true">
        {error && <p className="private-workspace__message is-error"><CircleAlert size={17} />{error}</p>}
        {notice && !error && <p className="private-workspace__message is-success"><Check size={17} />{notice}</p>}
      </div>

      {!connected ? (
        <section className="private-workspace__empty" aria-labelledby="private-empty-title">
          <div className="private-workspace__empty-symbol"><Database size={27} /></div>
          <h2 id="private-empty-title">Connect before viewing stored data</h2>
          <p>
            This workspace does not substitute sample data when the local API is unavailable.
            Configure the service and its database on the server, then connect with its service key.
          </p>
          <div className="private-workspace__limits">
            <strong>Current access model</strong>
            <span>One local operator key. There are no individual accounts, roles, or multi-user access controls yet.</span>
          </div>
        </section>
      ) : (
        <div className="private-workspace__content">
          <section className="private-workspace__summary" aria-label="Stored data summary">
            <article><span>Stored events</span><strong>{summary?.eventCount ?? "—"}</strong><small>In the configured data store</small></article>
            <article><span>Findings</span><strong>{summary?.findingCount ?? "—"}</strong><small>Detection matches recorded</small></article>
            <article><span>Open cases</span><strong>{summary?.openCaseCount ?? "—"}</strong><small>Cases needing follow-up</small></article>
            <article><span>Latest event</span><strong className="is-date">{summary ? isoDate(summary.latestEventAt) : "Unavailable"}</strong><small>Server-reported timestamp</small></article>
          </section>

          <section className="private-workspace__section private-workspace__analytics" aria-labelledby="private-analytics-title">
            <div className="private-workspace__section-heading">
              <div><p className="private-workspace__eyebrow">ACTIVITY</p><h2 id="private-analytics-title">Event activity</h2><p>Stored event counts by hour, source, and severity.</p></div>
            </div>
            {analytics ? <>
              <p className="private-workspace__analytics-window">Window: {utcDate(analytics.from)} – {utcDate(analytics.to)} (UTC). Bars show events per hour.</p>
              {analytics.buckets.length ? <>
                {!hasActivity && <p className="private-workspace__analytics-empty">No stored events in this 24-hour window.</p>}
                <figure className="private-workspace__activity-figure">
                  <figcaption className="private-workspace__chart-summary">Peak: {hasActivity ? activityMax.toLocaleString() : "0"} events per hour</figcaption>
                  <svg viewBox="0 0 760 210" role="img" aria-labelledby="private-activity-chart-title private-activity-chart-description" preserveAspectRatio="xMidYMid meet">
                    <title id="private-activity-chart-title">Events per hour</title>
                    <desc id="private-activity-chart-description">A bar chart of stored event counts per hour from {utcDate(analytics.from)} to {utcDate(analytics.to)}, with timestamps in UTC.</desc>
                    <line x1="48" y1="22" x2="48" y2="158" className="private-workspace__chart-axis" />
                    <line x1="48" y1="158" x2="742" y2="158" className="private-workspace__chart-axis" />
                    {analytics.buckets.map((bucket, index) => {
                      const slot = 694 / analytics.buckets.length;
                      const height = bucket.count === 0 ? 0 : Math.max(2, (bucket.count / activityMax) * 122);
                      const x = 49 + index * slot + slot * 0.2;
                      return <rect key={`${bucket.timestamp}-${index}`} x={x} y={158 - height} width={Math.max(2, slot * 0.6)} height={height} rx="2" className="private-workspace__chart-bar" />;
                    })}
                  </svg>
                  <div className="private-workspace__chart-times" aria-hidden="true"><span>{utcHour(analytics.from)}</span><span>{utcHour(analytics.to)} UTC</span></div>
                </figure>
                <details className="private-workspace__hourly-details"><summary>Hourly counts (UTC)</summary>
                <ol className="private-workspace__activity-values" aria-label="Hourly event counts, timestamps in UTC" tabIndex={0}>
                  {analytics.buckets.map((bucket, index) => <li key={`value-${bucket.timestamp}-${index}`}><time dateTime={bucket.timestamp}>{utcDate(bucket.timestamp)}</time><span>{bucket.count.toLocaleString()} {bucket.count === 1 ? "event" : "events"}</span></li>)}
                </ol>
                </details>
              </> : <p className="private-workspace__analytics-empty">No hourly event data is available for this window.</p>}
              <div className="private-workspace__analytics-breakdowns">
                <section aria-labelledby="private-source-counts-title">
                  <h3 id="private-source-counts-title">Top sources</h3>
                  {analytics.sources.length ? <ol>{analytics.sources.map((item) => <li key={item.source}><span>{item.source}</span><strong>{item.count.toLocaleString()}</strong></li>)}</ol> : <p>No source counts are available for this window.</p>}
                </section>
                <section aria-labelledby="private-severity-counts-title">
                  <h3 id="private-severity-counts-title">Severity counts</h3>
                  {analytics.severities.length ? <ul>{analytics.severities.map((item) => <li key={item.severity}><span>{severityLabel(item.severity)}</span><strong>{item.count.toLocaleString()}</strong></li>)}</ul> : <p>No severity counts are available for this window.</p>}
                </section>
              </div>
            </> : <p className="private-workspace__analytics-empty" role={analyticsError ? "alert" : undefined}>{analyticsError ? "Event analytics could not be loaded. Refresh the workspace to try again." : pending === "refresh" ? "Loading event analytics…" : "No analytics data is available yet."}</p>}
          </section>

          <section className="private-workspace__section" aria-labelledby="private-events-title">
            <div className="private-workspace__section-heading">
              <div>
                <p className="private-workspace__eyebrow">EVIDENCE</p>
                <h2 id="private-events-title">Events</h2>
                <p>Stored records from the last {filters.hours < 24 ? `${filters.hours} hour` : `${filters.hours / 24} ${filters.hours === 24 ? "day" : "days"}`}, newest first.</p>
              </div>
              <button
                className="private-workspace__button is-secondary"
                type="button"
                onClick={() => void addSyntheticSamples()}
                disabled={pending !== null || !administrator}
                title="Uses only the bundled synthetic sample fixtures"
              >
                <Plus size={16} /> Add synthetic sample events
              </button>
            </div>
            <p className="private-workspace__sample-note">
              This explicit action sends eight bundled synthetic records to the configured local service. No real telemetry is included.
            </p>
            <form className="private-workspace__filters" onSubmit={applyFilters}>
              <label className="private-workspace__search" htmlFor="private-event-search">
                <Search size={17} aria-hidden="true" />
                <input
                  id="private-event-search"
                  aria-label="Search event, host, or source"
                  value={queryDraft}
                  onChange={(event) => setQueryDraft(event.target.value)}
                  maxLength={120}
                  placeholder="Search event, host, or source"
                />
              </label>
              <label>
                <span id="private-source-label">Source</span>
                <select aria-labelledby="private-source-label" value={sourceDraft} onChange={(event) => setSourceDraft(event.target.value)}>
                  <option value="">All sources</option>
                  {sources.map((source) => <option key={source} value={source}>{source}</option>)}
                </select>
              </label>
              <label>
                <span id="private-severity-label">Severity</span>
                <select aria-labelledby="private-severity-label" value={severityDraft} onChange={(event) => setSeverityDraft(event.target.value)}>
                  <option value="">All severities</option>
                  {severities.map((severity) => <option key={severity} value={severity}>{severityLabel(severity)}</option>)}
                </select>
              </label>
              <label><span id="private-range-label">Time range</span><select aria-labelledby="private-range-label" value={hoursDraft} onChange={(event) => setHoursDraft(event.target.value)}>
                <option value="1">Last hour</option><option value="24">Last 24 hours</option><option value="168">Last 7 days</option><option value="720">Last 30 days</option>
              </select></label>
              <button className="private-workspace__button is-primary" type="submit" disabled={pending !== null}>
                <Search size={16} /> Apply filters
              </button>
            </form>
            <p className="private-workspace__scroll-hint" id="private-table-help">Scroll across the table to review every field. Use the Details action for the full record.</p>
            <div className="private-workspace__table-wrap" role="region" aria-label="Stored event table" aria-describedby="private-table-help" tabIndex={0}>
              <table className="private-workspace__table">
                <caption className="sr-only">Events stored in the local data store during the selected time range</caption>
                <thead><tr><th scope="col">Time</th><th scope="col">Event</th><th scope="col">Source</th><th scope="col">Host</th><th scope="col">Severity</th><th scope="col"><span className="sr-only">Details</span></th></tr></thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id}>
                      <td className="is-mono">{isoDate(event.timestamp)}</td>
                      <td className="private-workspace__event-name">{event.event}</td>
                      <td>{event.source}</td>
                      <td className="is-mono">{event.host}</td>
                      <td><span className={`private-workspace__severity is-${event.severity}`}>{severityLabel(event.severity)}</span></td>
                      <td><button className="private-workspace__text-button" type="button" onClick={() => setSelectedEvent(event)}>Details</button></td>
                    </tr>
                  ))}
                  {!events.length && <tr><td colSpan={6} className="private-workspace__table-empty">{pending === "refresh" ? "Loading stored events…" : "No stored events match these filters in the selected time range."}</td></tr>}
                </tbody>
              </table>
            </div>
            <ul className="private-workspace__mobile-events" aria-label="Stored events">
              {events.map((event) => (
                <li key={event.id}>
                  <h3>{event.event}</h3>
                  <time dateTime={event.timestamp}>{isoDate(event.timestamp)}</time>
                  <dl>
                    <div><dt>Source</dt><dd>{event.source}</dd></div>
                    <div><dt>Host</dt><dd className="is-mono">{event.host}</dd></div>
                    <div><dt>Severity</dt><dd><span className={`private-workspace__severity is-${event.severity}`}>{severityLabel(event.severity)}</span></dd></div>
                  </dl>
                  <button className="private-workspace__button is-secondary" type="button" onClick={() => setSelectedEvent(event)}>Details<span className="sr-only">: {event.event}</span></button>
                </li>
              ))}
              {!events.length && <li className="private-workspace__table-empty">{pending === "refresh" ? "Loading stored events…" : "No stored events match these filters in the selected time range."}</li>}
            </ul>
            {eventsCursor && <div className="private-workspace__load-more"><button className="private-workspace__button is-secondary" type="button" onClick={() => void loadMoreEvents()} disabled={pending !== null}>{pending === "events-more" ? <RefreshCw className="is-spinning" size={16} /> : <ChevronDown size={16} />} Load next 50 events</button></div>}
          </section>

          <section className="private-workspace__section" aria-labelledby="private-findings-title">
            <div className="private-workspace__section-heading">
              <div><p className="private-workspace__eyebrow">REVIEW</p><h2 id="private-findings-title">Findings</h2><p>Detection results with evidence and a path into case work.</p></div>
            </div>
            <div className="private-workspace__finding-list">
              {findings.map((finding) => (
                <article className="private-workspace__finding" key={finding.id}>
                  <div className="private-workspace__finding-top">
                    <span className={`private-workspace__severity is-${finding.severity}`}>{severityLabel(finding.severity)}</span>
                    <span className="private-workspace__finding-status">{severityLabel(finding.status)}</span>
                    <span className="private-workspace__finding-time">{isoDate(finding.timestamp)}</span>
                  </div>
                  <h3>{finding.name}</h3>
                  <p>{finding.reason}</p>
                  <dl><div><dt>Host</dt><dd>{finding.host || "Unknown"}</dd></div><div><dt>Rule</dt><dd className="is-mono">{finding.ruleId} · {finding.ruleVersion ? `v${finding.ruleVersion}` : "Version unknown"}</dd></div><div><dt>Technique</dt><dd className="is-mono">{finding.techniqueId || "—"}</dd></div></dl>
                  {finding.evidence?.length > 0 && <details className="private-workspace__evidence"><summary>Evidence ({finding.evidence.length})</summary><ul>{finding.evidence.slice(0, 20).map((item, index) => <li key={`${finding.id}-${index}`}>{item}</li>)}</ul></details>}
                  <div className="private-workspace__finding-actions">
                    <button className="private-workspace__button is-secondary" type="button" onClick={() => { setCaseFinding(finding); setCaseTitle(`Review: ${finding.name}`); setCaseNote(""); }} disabled={pending !== null || !canWrite}>
                      <Plus size={16} /> Create case
                    </button>
                    <span>Event <code>{finding.eventId}</code></span>
                  </div>
                </article>
              ))}
              {!findings.length && <div className="private-workspace__empty-inline"><ShieldCheck size={21} /><p>No findings are recorded yet. Findings appear when stored events match enabled detections.</p></div>}
            </div>
          </section>

          <section className="private-workspace__section" aria-labelledby="private-cases-title">
            <div className="private-workspace__section-heading"><div><p className="private-workspace__eyebrow">INVESTIGATIONS</p><h2 id="private-cases-title">Cases</h2><p>Update investigation notes and case status in the local data store.</p></div></div>
            <div className="private-workspace__case-list">
              {cases.map((item) => (
                <article className="private-workspace__case" key={item.id}>
                  <div className="private-workspace__case-heading">
                    <div><h3>{item.title}</h3><span className="is-mono">{item.id}</span></div>
                    <span className={`private-workspace__case-status is-${item.status}`}>{item.status === "open" ? "Open" : "Closed"}</span>
                  </div>
                  <p className="private-workspace__case-meta">Updated {isoDate(item.updatedAt)}{item.findingId ? <> · Finding <code>{item.findingId}</code></> : null}</p>
                  <label htmlFor={`case-note-${item.id}`}>Investigation notes</label>
                  <textarea id={`case-note-${item.id}`} value={caseNotes[item.id] ?? ""} maxLength={4000} disabled={pending === `case:${item.id}` || !canWrite} onChange={(event) => setCaseNotes((notes) => ({ ...notes, [item.id]: event.target.value }))} />
                  <div className="private-workspace__case-actions">
                    <button className="private-workspace__button is-primary" type="button" onClick={() => void updateCase(item)} disabled={pending !== null || !canWrite}>
                      <Check size={16} /> {pending === `case:${item.id}` ? "Saving…" : "Save notes"}
                    </button>
                    <button className="private-workspace__button is-secondary" type="button" onClick={() => void updateCase(item, item.status === "open" ? "closed" : "open")} disabled={pending !== null || !canWrite}>
                      {item.status === "open" ? <X size={16} /> : <RefreshCw size={16} />}
                      {item.status === "open" ? "Close case" : "Reopen case"}
                    </button>
                  </div>
                </article>
              ))}
              {!cases.length && <div className="private-workspace__empty-inline"><AlertTriangle size={21} /><p>No cases yet. Create one from a finding when investigation work needs a durable record.</p></div>}
            </div>
          </section>

          <section hidden={!administrator} className="private-workspace__section private-workspace__operations" aria-labelledby="private-operations-title">
            <div className="private-workspace__section-heading">
              <div><p className="private-workspace__eyebrow">CAPACITY</p><h2 id="private-operations-title">Operations</h2><p>Usage and retention values reported by the configured data store.</p></div>
            </div>
            {operations ? <>
              <dl className="private-workspace__operation-grid">
                <div><dt>Events</dt><dd>{operations.usage.eventCount.toLocaleString()} / {operations.limits.maxEvents.toLocaleString()}</dd></div>
                <div><dt>Stored event data</dt><dd>{formatBytes(operations.usage.eventBytes)} / {formatBytes(operations.limits.maxEventBytes)}</dd></div>
                <div><dt>Cases</dt><dd>{operations.usage.caseCount.toLocaleString()} / {operations.limits.maxCases.toLocaleString()}</dd></div>
                <div><dt>Audit entries</dt><dd>{operations.usage.auditCount.toLocaleString()} / {operations.limits.maxAuditEntries.toLocaleString()}</dd></div>
                <div><dt>Retention period</dt><dd>{operations.limits.retentionDays} days</dd></div>
                <div><dt>Retention eligible</dt><dd>{operations.retention.eligibleEvents.toLocaleString()} events</dd></div>
                <div><dt>Retention holds</dt><dd>{operations.retention.heldEvents.toLocaleString()} events</dd></div>
              </dl>
              <p className="private-workspace__operation-caveat">Eligible events are past the reported cutoff ({isoDate(operations.retention.cutoff)}). Held events remain retained; eligibility does not mean deletion has run.</p>
            </> : <p className="private-workspace__operation-caveat">Operations status is not available yet.</p>}
          </section>

          <section hidden={!administrator} className="private-workspace__section private-workspace__audit" aria-labelledby="private-audit-title">
            <div className="private-workspace__section-heading"><div><p className="private-workspace__eyebrow">ACTIVITY</p><h2 id="private-audit-title">Recent audit activity</h2><p>Latest recorded actions for this configured workspace.</p></div></div>
            {audit.length ? <ol className="private-workspace__audit-list">
              {audit.map((entry) => <li key={entry.id}>
                <div><strong>{auditActionLabel(entry.action)}</strong><time dateTime={entry.occurredAt}>{isoDate(entry.occurredAt)}</time></div>
                <span>{entry.actor === "user" ? `Account ${entry.details.actorId ?? "unknown"}` : entry.actor === "operator-service" ? "Service operator" : "Maintenance"}</span>
                {entry.resourceId && <code>{entry.resourceId}</code>}
              </li>)}
            </ol> : <p className="private-workspace__operation-caveat">No audit entries have been recorded.</p>}
          </section>

          <p className="private-workspace__footer-note"><LockKeyhole size={15} /> {sessionMode ? "Private account access is checked on the server for every request. This installation serves one configured workspace." : "Private data is served by the local service using the configured operator key."}</p>
        </div>
      )}

      <dialog ref={caseDialogRef} className="private-workspace__case-dialog" onCancel={() => setCaseFinding(null)} onClose={() => setCaseFinding(null)} aria-labelledby="private-create-case-title">
          {caseFinding && <>
            <div className="private-workspace__dialog-heading"><div><p className="private-workspace__eyebrow">LINKED INVESTIGATION</p><h2 id="private-create-case-title">Create a case</h2></div><button className="private-workspace__icon-button" type="button" aria-label="Close create case dialog" onClick={() => setCaseFinding(null)}><X size={19} /></button></div>
            <p className="private-workspace__dialog-context">This case will be linked to <strong>{caseFinding.name}</strong>.</p>
            <form onSubmit={createCase}>
              <label htmlFor="private-case-title">Case title</label>
              <input id="private-case-title" autoFocus value={caseTitle} maxLength={200} onChange={(event) => setCaseTitle(event.target.value)} required />
              <label htmlFor="private-case-note">Initial note <span>(optional)</span></label>
              <textarea id="private-case-note" value={caseNote} maxLength={4000} onChange={(event) => setCaseNote(event.target.value)} />
              {error && <p className="private-workspace__dialog-error" role="alert">{error}</p>}
              <div className="private-workspace__dialog-actions"><button className="private-workspace__button is-secondary" type="button" onClick={() => setCaseFinding(null)}>Cancel</button><button className="private-workspace__button is-primary" type="submit" disabled={pending !== null}><Plus size={16} /> Create case</button></div>
            </form>
          </>}
      </dialog>

      <dialog ref={dialogRef} className="private-workspace__event-dialog" onCancel={() => setSelectedEvent(null)} onClose={() => setSelectedEvent(null)} aria-labelledby="private-event-detail-title">
        {selectedEvent && <>
          <div className="private-workspace__dialog-heading"><div><p className="private-workspace__eyebrow">STORED EVENT</p><h2 id="private-event-detail-title">{selectedEvent.event}</h2></div><button className="private-workspace__icon-button" type="button" aria-label="Close event details" onClick={() => setSelectedEvent(null)}><X size={19} /></button></div>
          <dl className="private-workspace__detail-grid"><div><dt>Timestamp</dt><dd>{isoDate(selectedEvent.timestamp)}</dd></div><div><dt>Source</dt><dd>{selectedEvent.source}</dd></div><div><dt>Host</dt><dd>{selectedEvent.host}</dd></div><div><dt>Severity</dt><dd>{severityLabel(selectedEvent.severity)}</dd></div><div><dt>Event ID</dt><dd className="is-mono">{selectedEvent.eventId}</dd></div><div><dt>Record ID</dt><dd className="is-mono">{selectedEvent.id}</dd></div></dl>
          {selectedEvent.attributes && <section><h3>Normalized attributes</h3><pre>{JSON.stringify(selectedEvent.attributes, null, 2)}</pre></section>}
          {selectedEvent.raw && <section><h3>Raw record</h3><pre>{selectedEvent.raw}</pre></section>}
        </>}
      </dialog>
    </section>
  );
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function auditActionLabel(action: AuditEntry["action"]) {
  switch (action) {
    case "events.ingested": return "Events ingested";
    case "case.created": return "Case created";
    case "case.updated": return "Case updated";
    case "retention.applied": return "Retention applied";
    case "limits.updated": return "Workspace limits updated";
  }
}
