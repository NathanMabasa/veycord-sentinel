import { useEffect, useMemo, useRef, useState } from "react";
import React from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  BookOpen,
  Check,
  CircleHelp,
  Download,
  FileSearch,
  HardDrive,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  Moon,
  Plus,
  Search,
  Settings2,
  Shield,
  ShieldAlert,
  Sun,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import "./console.css";
import {
  demoEvents,
  detections,
  initialAlerts,
  type DemoEvent,
  type Severity,
} from "../../data/demo";
import Brand from "../../components/Brand";
type Page =
  | "Overview"
  | "Explore"
  | "Detections"
  | "Alerts"
  | "Cases"
  | "Sources"
  | "Reports"
  | "Settings";
type AlertItem = {
  id: string;
  detectionId: string;
  eventId: string;
  severity: Severity;
  status: "New" | "Investigating" | "Resolved";
  time: string;
  title: string;
  host: string;
};
type CaseItem = {
  id: string;
  title: string;
  alertIds: string[];
  note: string;
  status: "Open" | "Closed";
  created: string;
};
const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const knownAlertIds = new Set(initialAlerts.map((alert) => alert.id));
const knownDetectionIds = new Set(detections.map((detection) => detection.id));
const knownEventIds = new Set(demoEvents.map((event) => event.id));
const validAlerts = (value: unknown): value is AlertItem[] =>
  Array.isArray(value) &&
  value.length <= initialAlerts.length &&
  value.every(
    (item) =>
      isRecord(item) &&
      typeof item.id === "string" &&
      knownAlertIds.has(item.id) &&
      typeof item.detectionId === "string" &&
      knownDetectionIds.has(item.detectionId) &&
      typeof item.eventId === "string" &&
      knownEventIds.has(item.eventId) &&
      ["High", "Medium", "Low"].includes(String(item.severity)) &&
      ["New", "Investigating", "Resolved"].includes(String(item.status)) &&
      typeof item.time === "string" &&
      item.time.length <= 40 &&
      typeof item.title === "string" &&
      item.title.length <= 200 &&
      typeof item.host === "string" &&
      item.host.length <= 100,
  );
const validCases = (value: unknown): value is CaseItem[] =>
  Array.isArray(value) &&
  value.length <= 1000 &&
  value.every(
    (item) =>
      isRecord(item) &&
      typeof item.id === "string" &&
      item.id.length <= 100 &&
      typeof item.title === "string" &&
      item.title.length <= 200 &&
      Array.isArray(item.alertIds) &&
      item.alertIds.length <= 100 &&
      item.alertIds.every(
        (id: unknown) => typeof id === "string" && knownAlertIds.has(id),
      ) &&
      typeof item.note === "string" &&
      item.note.length <= 2000 &&
      ["Open", "Closed"].includes(String(item.status)) &&
      typeof item.created === "string",
  );
const validSettings = (
  value: unknown,
): value is { workspace: string; retention: string; dense: boolean } =>
  isRecord(value) &&
  typeof value.workspace === "string" &&
  value.workspace.trim().length > 0 &&
  value.workspace.length <= 40 &&
  ["7 days", "30 days", "90 days"].includes(String(value.retention)) &&
  typeof value.dense === "boolean";
const validSearches = (value: unknown): value is string[] =>
  Array.isArray(value) &&
  value.length <= 100 &&
  value.every((item) => typeof item === "string" && item.length <= 200);
function readDemoState<T>(
  key: string,
  fallback: T,
  validate: (value: unknown) => value is T,
): T {
  try {
    const value = window.localStorage.getItem(`veycord-demo:v1:${key}`);
    if (!value) return fallback;
    const parsed: unknown = JSON.parse(value);
    return validate(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}
function writeDemoState(key: string, value: unknown) {
  try {
    window.localStorage.setItem(
      `veycord-demo:v1:${key}`,
      JSON.stringify(value),
    );
    return true;
  } catch {
    return false;
  }
}
const navItems: { label: Page; icon: typeof LayoutDashboard }[] = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Explore", icon: Search },
  { label: "Detections", icon: ShieldAlert },
  { label: "Alerts", icon: Bell },
  { label: "Cases", icon: FileSearch },
  { label: "Sources", icon: HardDrive },
  { label: "Reports", icon: BookOpen },
  { label: "Settings", icon: Settings2 },
];
function Chart({ events }: { events: DemoEvent[] }) {
  const sourceCounts = useMemo(() => {
    const counts = new Map<string, number>();
    events.forEach((event) =>
      counts.set(event.source, (counts.get(event.source) ?? 0) + 1),
    );
    return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [events]);
  const maxCount = Math.max(1, ...sourceCounts.map(([, count]) => count));
  return (
    <div
      className="chart-wrap"
      role="group"
      aria-label="Synthetic event counts grouped by source"
    >
      <ul className="source-count-list">
        {sourceCounts.map(([source, count]) => (
          <li key={source}>
            <span>{source}</span>
            <span className="source-count-track" aria-hidden="true">
              <i style={{ width: `${(count / maxCount) * 100}%` }} />
            </span>
            <b>{count}</b>
          </li>
        ))}
      </ul>
      <p className="chart-footnote">
        Counts from {events.length} bundled fixture records.
      </p>
    </div>
  );
}
export default function Console() {
  const storedTheme =
    readDemoState(
      "theme",
      "light",
      (value): value is string => value === "dark" || value === "light",
    ) === "light"
      ? "light"
      : "dark";
  const [theme, setTheme] = useState<"light" | "dark">(storedTheme);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const persist = (key: string, value: unknown) => {
    const success = writeDemoState(key, value);
    if (!success) setStorageAvailable(false);
    return success;
  };
  const [page, setPage] = useState<Page>("Overview"),
    [search, setSearch] = useState(""),
    [sourceFilter, setSourceFilter] = useState("All sources"),
    [severityFilter, setSeverityFilter] = useState("Any severity"),
    [mobileNav, setMobileNav] = useState(false),
    [selectedEvent, setSelectedEvent] = useState<DemoEvent | null>(null),
    [alerts, setAlerts] = useState<AlertItem[]>(() =>
      readDemoState("alerts", initialAlerts, validAlerts),
    ),
    [cases, setCases] = useState<CaseItem[]>(() =>
      readDemoState("cases", [], validCases),
    ),
    [settings, setSettings] = useState(() =>
      readDemoState(
        "settings",
        {
          workspace: "Learning workspace",
          retention: "30 days",
          dense: false,
        },
        validSettings,
      ),
    ),
    [toast, setToast] = useState(""),
    [savedSearches, setSavedSearches] = useState<string[]>(() =>
      readDemoState("saved-searches", [], validSearches),
    );
  const navToggleRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    document.title = `${page} · Demo | Veycord Sentinel`;
  }, [page]);
  const sidebarRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!mobileNav) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebarRef.current?.querySelector<HTMLButtonElement>(".close-nav")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileNav(false);
      } else if (event.key === "Tab") {
        const controls = Array.from(
          sidebarRef.current?.querySelectorAll<HTMLElement>(
            "a[href], button:not([disabled]), [tabindex='0']",
          ) ?? [],
        ).filter((element) => element.getClientRects().length > 0);
        const first = controls[0],
          last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    const onResize = () => {
      if (window.innerWidth > 760) setMobileNav(false);
    };
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
      document.body.style.overflow = previousOverflow;
      requestAnimationFrame(() => navToggleRef.current?.focus());
    };
  }, [mobileNav]);
  useEffect(() => {
    persist("alerts", alerts);
  }, [alerts]);
  useEffect(() => {
    persist("cases", cases);
  }, [cases]);
  useEffect(() => {
    persist("settings", settings);
  }, [settings]);
  useEffect(() => {
    persist("saved-searches", savedSearches);
  }, [savedSearches]);
  useEffect(() => {
    persist("theme", theme);
  }, [theme]);
  const events = useMemo(
    () =>
      demoEvents.filter(
        (r) =>
          `${r.event} ${r.source} ${r.host} ${r.severity} ${r.user} ${r.srcIp}`
            .toLowerCase()
            .includes(search.toLowerCase()) &&
          (sourceFilter === "All sources" || r.source === sourceFilter) &&
          (severityFilter === "Any severity" || r.severity === severityFilter),
      ),
    [search, sourceFilter, severityFilter],
  );
  const notify = (s: string) => {
      setToast(s);
      window.setTimeout(() => setToast(""), 2600);
    },
    go = (p: Page) => {
      setPage(p);
      setSelectedEvent(null);
      setMobileNav(false);
    };
  const saveSearch = () => {
    if (!search.trim()) return notify("Enter a search term first.");
    if (search.trim().length > 200) return notify("Use 200 characters or fewer for a saved search.");
    if (savedSearches.length >= 100 && !savedSearches.includes(search.trim())) return notify("The limit of 100 saved searches has been reached.");
    setSavedSearches((v) =>
      v.includes(search.trim()) ? v : [...v, search.trim()],
    );
    notify(
      storageAvailable
        ? "Search saved in this browser."
        : "Search saved for this session only.",
    );
  };
  const createCase = (a: AlertItem) => {
    const existing = cases.find((item) => item.alertIds.includes(a.id));
    if (existing) {
      notify(`${a.id} is already linked to ${existing.id}.`);
      go("Cases");
      return;
    }
    const c: CaseItem = {
      id: `CASE-${String(2100 + cases.length).padStart(4, "0")}`,
      title: `Review: ${a.title}`,
      alertIds: [a.id],
      note: "Created from alert queue. Add context after reviewing the evidence.",
      status: "Open",
      created: new Date().toLocaleString(),
    };
    setCases((v) => [c, ...v]);
    setAlerts((v) =>
      v.map((x) => (x.id === a.id ? { ...x, status: "Investigating" } : x)),
    );
    notify(`${c.id} created from ${a.id}.`);
    go("Cases");
  };
  const updateCase = (
    id: string,
    updates: Partial<Pick<CaseItem, "note" | "status">>,
  ) =>
    setCases((items) =>
      items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    );
  const exportCase = (item: CaseItem) => {
    const blob = new Blob([JSON.stringify(item, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${item.id.toLowerCase()}-synthetic-case.json`;
    link.click();
    URL.revokeObjectURL(url);
    notify(`${item.id} exported as JSON.`);
  };
  const exportData = () => {
    const b = new Blob([JSON.stringify(events, null, 2)], {
        type: "application/json",
      }),
      u = URL.createObjectURL(b),
      a = document.createElement("a");
    a.href = u;
    a.download = "veycord-synthetic-events.json";
    a.click();
    URL.revokeObjectURL(u);
    notify("Synthetic events exported as JSON.");
  };
  const reset = () => {
    setAlerts(initialAlerts);
    setCases([]);
    setSearch("");
    setSourceFilter("All sources");
    setSeverityFilter("Any severity");
    setSettings({
      workspace: "Learning workspace",
      retention: "30 days",
      dense: false,
    });
    setSavedSearches([]);
    setSelectedEvent(null);
    go("Overview");
    notify("Demo reset to its original sample state.");
  };
  return (
    <div
      className={`console-shell theme-${theme}${settings.dense ? " is-compact" : ""}`}
    >
      {mobileNav && (
        <button
          aria-label="Close navigation menu"
          tabIndex={-1}
          onClick={() => {
            setMobileNav(false);
            navToggleRef.current?.focus();
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 5,
            border: 0,
            background: "rgba(0,0,0,.55)",
          }}
        />
      )}
      <aside
        id="workspace-navigation"
        ref={sidebarRef}
        className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}
        role={mobileNav ? "dialog" : undefined}
        aria-modal={mobileNav || undefined}
        aria-label="Workspace navigation"
      >
        <div className="sidebar-top">
          <Brand />
          <button
            className="icon-button close-nav"
            onClick={() => setMobileNav(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>
        <div className="workspace-switch">
          <div className="workspace-avatar">
            {settings.workspace[0].toUpperCase()}
          </div>
          <div>
            <b>{settings.workspace}</b>
            <small>Browser-only demo</small>
          </div>
        </div>
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Product navigation">
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={page === label ? "active" : ""}
              aria-current={page === label ? "page" : undefined}
              onClick={() => go(label)}
            >
              <Icon size={17} />
              <span>{label}</span>
              {label === "Alerts" &&
                alerts.filter((a) => a.status !== "Resolved").length > 0 && (
                  <i
                    className="nav-count"
                    aria-label={`${alerts.filter((a) => a.status !== "Resolved").length} unresolved alerts`}
                  >
                    {alerts.filter((a) => a.status !== "Resolved").length}
                  </i>
                )}
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="setup-card">
          <div className="setup-icon">
            <BookOpen size={16} />
          </div>
          <b>Practice investigation</b>
          <p>Review an alert, inspect evidence, then open a case.</p>
          <button onClick={() => go("Alerts")}>
            Open alert queue <ArrowRight size={14} />
          </button>
        </div>
        <div className="user-menu">
          <div className="user-avatar">JD</div>
          <span>
            <b>Jordan Demo</b>
            <small>Local demo analyst</small>
          </span>
        </div>
      </aside>
      <main className="console-main" inert={mobileNav}>
        <header className="console-topbar">
          <button
            className="icon-button nav-toggle"
            ref={navToggleRef}
            onClick={() => setMobileNav(true)}
            aria-label="Open navigation"
            aria-expanded={mobileNav}
            aria-controls="workspace-navigation"
          >
            <Menu size={19} />
          </button>
          <div className="breadcrumbs">
            <Link to="/" aria-label="Sentinel product website">
              Sentinel
            </Link>
            <span>/</span>
            <span>{page}</span>
          </div>
          <button
            className="global-search global-search-action"
            onClick={() => go("Explore")}
            aria-label="Search sample events"
          >
            <Search size={16} />
            <span>Search sample events</span>
          </button>
          <button
            className="icon-button theme-toggle"
            onClick={() =>
              setTheme((v) => {
                const next = v === "dark" ? "light" : "dark";
                return next;
              })
            }
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}{" "}
          </button>
          <button
            className="icon-button top-help"
            onClick={() => go("Reports")}
            aria-label="Open learning guide"
          >
            <CircleHelp size={18} />
          </button>
          <div className="top-avatar">JD</div>
        </header>
        <div className="demo-banner">
          <span>
            Synthetic dataset
          </span>
          <p>
            {storageAvailable
              ? "Your alert and case changes stay in this browser."
              : "Sample records only. Changes last for this session; browser storage is unavailable."}
          </p>
          <button onClick={reset}>
            Reset demo
          </button>
        </div>
        {selectedEvent ? (
          <EventDetail
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
            onAlerts={() => go("Alerts")}
          />
        ) : (
          <Content
            page={page}
            events={events}
            alerts={alerts}
            cases={cases}
            settings={settings}
            setSettings={setSettings}
            theme={theme}
            setTheme={setTheme}
            resetDemo={reset}
            search={search}
            setSearch={setSearch}
            sourceFilter={sourceFilter}
            setSourceFilter={setSourceFilter}
            severityFilter={severityFilter}
            setSeverityFilter={setSeverityFilter}
            saved={savedSearches}
            saveSearch={saveSearch}
            exportData={exportData}
            openEvent={setSelectedEvent}
            markAlert={(id, status) => {
              setAlerts((v) =>
                v.map((a) => (a.id === id ? { ...a, status } : a)),
              );
              notify(`${id} updated.`);
            }}
            createCase={createCase}
            updateCase={updateCase}
            exportCase={exportCase}
            go={go}
            notify={notify}
          />
        )}
        {toast && (
          <div role="status" className="toast">
            <Check size={15} />
            {toast}
          </div>
        )}
      </main>
    </div>
  );
}
type ContentProps = {
  page: Page;
  events: DemoEvent[];
  alerts: AlertItem[];
  cases: CaseItem[];
  settings: { workspace: string; retention: string; dense: boolean };
  setSettings: (v: {
    workspace: string;
    retention: string;
    dense: boolean;
  }) => void;
  theme: "light" | "dark";
  setTheme: React.Dispatch<React.SetStateAction<"light" | "dark">>;
  resetDemo: () => void;
  search: string;
  setSearch: (v: string) => void;
  sourceFilter: string;
  setSourceFilter: (v: string) => void;
  severityFilter: string;
  setSeverityFilter: (v: string) => void;
  saved: string[];
  saveSearch: () => void;
  exportData: () => void;
  openEvent: (e: DemoEvent) => void;
  markAlert: (id: string, status: AlertItem["status"]) => void;
  createCase: (a: AlertItem) => void;
  updateCase: (
    id: string,
    updates: Partial<Pick<CaseItem, "note" | "status">>,
  ) => void;
  exportCase: (item: CaseItem) => void;
  go: (p: Page) => void;
  notify: (s: string) => void;
};
function Content(p: ContentProps) {
  switch (p.page) {
    case "Overview":
      return <Overview {...p} />;
    case "Explore":
      return <Explore {...p} />;
    case "Detections":
      return <DetectionPage {...p} />;
    case "Alerts":
      return <AlertPage {...p} />;
    case "Cases":
      return <CasesPage {...p} />;
    case "Sources":
      return <SourcesPage {...p} />;
    case "Reports":
      return <GuidePage {...p} />;
    case "Settings":
      return <SettingsPage {...p} />;
  }
}
function Heading({
  kicker,
  title,
  subtitle,
  children,
}: {
  kicker: string;
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="heading-kicker">{kicker}</div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {children && <div className="heading-actions">{children}</div>}
    </div>
  );
}
function Metric({
  label,
  value,
  delta,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  delta: string;
  detail: string;
  icon: typeof Activity;
  tone: string;
}) {
  return (
    <section className="metric-card">
      <div className="metric-top">
        <span>{label}</span>
        <i className={`metric-icon ${tone}`}>
          <Icon size={16} />
        </i>
      </div>
      <div className="metric-value-row">
        <strong>{value}</strong>
      </div>
      <div className="metric-bottom">
        <span className={`metric-delta ${tone}`}>{delta}</span>
        <span>{detail}</span>
      </div>
    </section>
  );
}
function Overview(p: ContentProps) {
  const open = p.alerts.filter((a) => a.status !== "Resolved"),
    high = open.filter((a) => a.severity === "High").length,
    sources = new Set(demoEvents.map((e) => e.source)).size;
  return (
    <div className="content-area">
      <Heading
        kicker="Workspace overview"
        title="Security overview"
        subtitle="A small synthetic environment for practising event investigation."
      >
        <span className="sample-label">
          Fixture records: 08:21–09:42
        </span>
        <button
          className="button button-secondary"
          onClick={() => p.go("Explore")}
        >
          <Search size={15} /> Explore events
        </button>
      </Heading>
      <div className="metric-grid">
        <Metric
          label="Sample events"
          value={String(demoEvents.length)}
          delta="Synthetic"
          detail="Bundled example records"
          icon={Activity}
          tone="orange"
        />
        <Metric
          label="Open alerts"
          value={String(open.length)}
          delta={`${high} high`}
          detail="Review the evidence"
          icon={ShieldAlert}
          tone="red"
        />
        <Metric
          label="Starter detections"
          value={String(detections.length)}
          delta="Evidence linked"
          detail="Includes analyst guidance"
          icon={Shield}
          tone="blue"
        />
        <Metric
          label="Sample sources"
          value={String(sources)}
          delta="Local fixtures"
          detail="No live connections"
          icon={HardDrive}
          tone="slate"
        />
      </div>
      <div className="dashboard-grid">
        <section className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <h2>Sample events by source</h2>
              <p>Counts grouped from the bundled example records.</p>
            </div>
            <span className="sample-label">Synthetic dataset</span>
          </div>
          <Chart events={demoEvents} />
        </section>
        <section className="panel alert-panel">
          <div className="panel-heading">
            <div>
              <h2>Alerts to review</h2>
              <p>{open.length} unresolved alerts</p>
            </div>
          </div>
          <div className="priority-summary">
            <b>{high}</b>
            <span>high priority need review</span>
          </div>
          <PriorityList alerts={p.alerts} go={() => p.go("Alerts")} />
          <button className="panel-link" onClick={() => p.go("Alerts")}>
            Open alert queue <ArrowRight size={14} />
          </button>
        </section>
        <section className="panel events-panel">
          <div className="panel-heading">
            <div>
              <h2>Recent events</h2>
              <p>Select an event to inspect its fields and raw record.</p>
            </div>
            <button className="panel-link" onClick={() => p.go("Explore")}>
              Explore all events <ArrowRight size={14} />
            </button>
          </div>
          <EventTable events={p.events.slice(0, 5)} open={p.openEvent} />
        </section>
        <section className="panel detections-panel">
          <div className="panel-heading">
            <div>
              <h2>Starter detections</h2>
              <p>Rules include limits and follow-up advice.</p>
            </div>
          </div>
          <div className="detection-list">
            {detections.slice(0, 3).map((r) => (
              <button
                key={r.id}
                className="detection-row"
                onClick={() => p.go("Detections")}
              >
                <span
                  className={`detection-indicator ${r.severity.toLowerCase()}`}
                />
                <span className="detection-copy">
                  <b>{r.name}</b>
                  <small>
                    {r.category} · {r.id}
                  </small>
                </span>
                <ArrowRight size={14} />
              </button>
            ))}
          </div>
          <button className="panel-link" onClick={() => p.go("Detections")}>
            Review detections <ArrowRight size={14} />
          </button>
        </section>
      </div>
      <div className="console-bottomline">
        <span>Local synthetic workspace</span>
        <span>
          Browser storage only <span className="bottom-sep">/</span>
          <button onClick={() => p.go("Settings")}>Workspace settings</button>
        </span>
      </div>
    </div>
  );
}
function Explore(p: ContentProps) {
  const sources = [
    "All sources",
    ...Array.from(new Set(demoEvents.map((e) => e.source))),
  ];
  return (
    <div className="content-area">
      <Heading
        kicker="Workspace / Explore"
        title="Explore events"
        subtitle="Filter synthetic records and inspect the evidence behind each one."
      >
        <button className="button button-secondary" onClick={p.saveSearch}>
          <Check size={14} /> Save search
        </button>
        <button className="button button-secondary" onClick={p.exportData}>
          <Download size={14} /> Export JSON
        </button>
      </Heading>
      <section className="panel query-panel">
        <label className="query-input">
          <Search size={17} />
          <input
            aria-label="Search sample events"
            maxLength={200}
            autoFocus
            placeholder="Search event, host, user, IP, or source…"
            value={p.search}
            onChange={(e) => p.setSearch(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") p.saveSearch();
            }}
          />
          <kbd>⌘ ↵ to save</kbd>
        </label>
        <div className="query-filters">
          <label>
            <span>Source</span>
            <select
              aria-label="Filter by source"
              value={p.sourceFilter}
              onChange={(e) => p.setSourceFilter(e.target.value)}
            >
              {sources.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Severity</span>
            <select
              aria-label="Filter by severity"
              value={p.severityFilter}
              onChange={(e) => p.setSeverityFilter(e.target.value)}
            >
              {["Any severity", "High", "Medium", "Low"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <button
            className="clear-filters"
            onClick={() => {
              p.setSearch("");
              p.setSourceFilter("All sources");
              p.setSeverityFilter("Any severity");
            }}
          >
            Clear filters
          </button>
          <span className="result-count">
            {p.events.length} of {demoEvents.length} sample events
          </span>
        </div>
      </section>
      {p.saved.length > 0 && (
        <div className="saved-searches">
          <span>Saved in this browser:</span>
          {p.saved.map((s) => (
            <button key={s} onClick={() => p.setSearch(s)}>
              {s}
            </button>
          ))}
        </div>
      )}
      <section className="panel events-panel full-table">
        <div className="panel-heading">
          <div>
            <h2>Event results</h2>
            <p>Fabricated records for this demonstration.</p>
          </div>
          <span className="sample-label">Sample dataset</span>
        </div>
        <EventTable events={p.events} open={p.openEvent} />
      </section>
    </div>
  );
}
function EventTable({
  events,
  open,
}: {
  events: DemoEvent[];
  open: (e: DemoEvent) => void;
}) {
  if (!events.length)
    return (
      <div className="empty-state">
        <Search size={20} />
        <b>No matching sample events</b>
        <span>Change or clear the filters to see fixture records.</span>
      </div>
    );
  return (
    <div
      className="table-scroll"
      role="region"
      aria-label="Sample event results"
      tabIndex={0}
      aria-describedby="event-table-scroll-help"
    >
      <p id="event-table-scroll-help" className="sr-only">
        Scroll horizontally to review all event fields.
      </p>
      <table>
        <caption className="sr-only">Sample event results</caption>
        <thead>
          <tr>
            <th scope="col">TIME</th>
            <th scope="col">EVENT</th>
            <th scope="col">SOURCE</th>
            <th scope="col">HOST</th>
            <th scope="col">SEVERITY</th>
            <th scope="col">OUTCOME</th>
          </tr>
        </thead>
        <tbody>
          {events.map((r) => (
            <tr key={r.id}>
              <td className="mono">{r.time}</td>
              <td>
                <span
                  className={`event-icon event-${r.severity.toLowerCase()}`}
                >
                  {r.severity === "High" ? (
                    <AlertTriangle size={13} />
                  ) : (
                    <Activity size={13} />
                  )}
                </span>
                <button
                  className="event-open"
                  aria-label={`Inspect event ${r.event} (${r.id})`}
                  onClick={() => open(r)}
                >
                  {r.event}
                </button>
              </td>
              <td>{r.source}</td>
              <td className="mono host-cell">{r.host}</td>
              <td>
                <SeverityBadge value={r.severity} />
              </td>
              <td>{r.outcome}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function SeverityBadge({ value }: { value: Severity }) {
  return (
    <span className={`severity severity-${value.toLowerCase()}`}>
      <i />
      {value}
    </span>
  );
}
function EventDetail({
  event,
  onClose,
  onAlerts,
}: {
  event: DemoEvent;
  onClose: () => void;
  onAlerts: () => void;
}) {
  const rules = detections.filter((r) => r.eventId === event.id);
  return (
    <div className="content-area detail-area">
      <button className="back-link" onClick={onClose}>
        ← Back to results
      </button>
      <div className="detail-header">
        <div>
          <div className="heading-kicker">Event evidence / {event.id}</div>
          <h1>{event.event}</h1>
          <p>
            {event.timestamp} · {event.source} · {event.host}
          </p>
        </div>
        <SeverityBadge value={event.severity} />
      </div>
      <div className="detail-columns">
        <div className="detail-main">
          <section className="panel detail-panel">
            <div className="panel-heading">
              <div>
                <h2>Event context</h2>
                <p>Normalized fields from a synthetic record.</p>
              </div>
              <span className="sample-label">SYNTHETIC</span>
            </div>
            <p className="event-explanation">{event.detail}</p>
            <dl className="field-grid">
              {[
                ["Event ID", event.id],
                ["Timestamp", event.timestamp],
                ["Source", event.source],
                ["Host", event.host],
                ["User", event.user],
                ["Source IP", event.srcIp],
                ["Outcome", event.outcome],
                ["Severity", event.severity],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="panel detail-panel raw-panel">
            <div className="panel-heading">
              <div>
                <h2>Raw sample record</h2>
                <p>Fixture JSON stored with this demo dataset.</p>
              </div>
              <button
                className="small-control"
                onClick={() => navigator.clipboard?.writeText(event.raw)}
              >
                Copy JSON
              </button>
            </div>
            <pre>{event.raw}</pre>
          </section>
        </div>
        <aside className="detail-side">
          <section className="panel detail-panel">
            <div className="panel-heading">
              <div>
                <h2>Related detection</h2>
              </div>
            </div>
            {rules.length ? (
              rules.map((r) => (
                <div key={r.id} className="linked-rule">
                  <span className="eyebrow">
                    {r.id} · {r.category}
                  </span>
                  <b>{r.name}</b>
                  <p>{r.rationale}</p>
                  <h3>What to check</h3>
                  <p>{r.next}</p>
                  <button className="text-button" onClick={onAlerts}>
                    Open alert queue <ArrowRight size={14} />
                  </button>
                </div>
              ))
            ) : (
              <p className="muted-paragraph">
                No starter detection is linked to this record.
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
function PriorityList({ alerts, go }: { alerts: AlertItem[]; go: () => void }) {
  return (
    <div className="priority-list">
      {alerts
        .filter((a) => a.status !== "Resolved")
        .slice(0, 3)
        .map((a) => (
          <button key={a.id} onClick={go}>
            <i className={`severity-dot ${a.severity.toLowerCase()}`} />
            <span>{a.title}</span>
            <b>{a.time}</b>
          </button>
        ))}
    </div>
  );
}
function AlertPage(p: ContentProps) {
  const unresolved = p.alerts.filter((a) => a.status !== "Resolved").length;
  return (
    <div className="content-area">
      <Heading
        kicker="Workspace / Alerts"
        title="Alert queue"
        subtitle="A rule match is a lead for review, not proof of compromise."
      >
        <span className="queue-count">{unresolved} unresolved</span>
      </Heading>
      <div className="alert-cards">
        {p.alerts.map((a) => {
          const rule = detections.find((r) => r.id === a.detectionId)!,
            event = demoEvents.find((e) => e.id === a.eventId)!;
          return (
            <article className="panel alert-card" key={a.id}>
              <div className="alert-card-top">
                <SeverityBadge value={a.severity} />
                <span className={`state state-${a.status.toLowerCase()}`}>
                  {a.status}
                </span>
                <span className="alert-time">{a.time}</span>
              </div>
              <h2>{a.title}</h2>
              <p>
                {a.host} · {event.source} · {a.id}
              </p>
              <div className="alert-rationale">
                <b>Why this fired</b>
                <span>{rule.rationale}</span>
              </div>
              <div className="alert-evidence">
                <span>Evidence</span>
                <button onClick={() => p.openEvent(event)}>
                  {event.event}
                  <ArrowRight size={13} />
                </button>
              </div>
              <div className="alert-actions">
                <button
                  className="button button-secondary"
                  onClick={() => p.openEvent(event)}
                >
                  Review evidence
                </button>
                {a.status !== "Resolved" ? (
                  <>
                    <button
                      className="button button-secondary"
                      onClick={() => p.markAlert(a.id, "Resolved")}
                    >
                      <Check size={14} /> Resolve
                    </button>
                    <button
                      className="button button-primary"
                      onClick={() => p.createCase(a)}
                    >
                      <Plus size={14} /> Create case
                    </button>
                  </>
                ) : (
                  <button
                    className="button button-secondary"
                    onClick={() => p.markAlert(a.id, "New")}
                  >
                    Reopen
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
function DetectionPage(p: ContentProps) {
  return (
    <div className="content-area">
      <Heading
        kicker="Workspace / Detections"
        title="Starter detections"
        subtitle="Transparent examples with evidence, limitations, and analyst checks."
      />
      <div className="detection-cards">
        {detections.map((r) => {
          const event = demoEvents.find((e) => e.id === r.eventId)!;
          return (
            <article className="panel detection-card" key={r.id}>
              <div className="detection-card-head">
                <span className="eyebrow">
                  {r.id} · {r.category}
                </span>
                <SeverityBadge value={r.severity} />
              </div>
              <h2>{r.name}</h2>
              <p>{r.description}</p>
              <div className="rule-section">
                <b>Why it matters</b>
                <span>{r.rationale}</span>
              </div>
              <div className="rule-section">
                <b>What to check</b>
                <span>{r.next}</span>
              </div>
              <button
                className="text-button"
                onClick={() => p.openEvent(event)}
              >
                Inspect matched sample event <ArrowRight size={14} />
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
function CasesPage(p: ContentProps) {
  return (
    <div className="content-area">
      <Heading
        kicker="Workspace / Cases"
        title="Investigation cases"
        subtitle="Case notes and status are saved in this browser."
      >
        <span className="queue-count">{p.cases.length} {p.cases.length === 1 ? "case" : "cases"}</span>
      </Heading>
      {p.cases.length ? (
        <div className="case-list">
          {p.cases.map((c) => (
            <article className="panel case-card" key={c.id}>
              <div className="case-top">
                <span className="case-id">{c.id}</span>
                <span className={`state state-${c.status.toLowerCase()}`}>
                  {c.status}
                </span>
              </div>
              <h2>{c.title}</h2>
              <label className="case-note-label" htmlFor={`case-note-${c.id}`}>
                Analyst note
              </label>
              <textarea
                id={`case-note-${c.id}`}
                value={c.note}
                maxLength={2000}
                aria-label={`Analyst note for ${c.id}`}
                onChange={(event) =>
                  p.updateCase(c.id, { note: event.target.value })
                }
              />
              <div className="case-bottom">
                <span>Linked alert: {c.alertIds.join(", ")}</span>
                <span>Created {c.created}</span>
              </div>
              <div className="alert-actions">
                <button
                  className="button button-secondary"
                  onClick={() =>
                    p.updateCase(c.id, {
                      status: c.status === "Open" ? "Closed" : "Open",
                    })
                  }
                >
                  {c.status === "Open" ? "Close case" : "Reopen case"}
                </button>
                <button
                  className="button button-secondary"
                  onClick={() => p.exportCase(c)}
                >
                  <Download size={14} /> Export case JSON
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="panel empty-state case-empty">
          <FileSearch size={24} />
          <b>No cases yet</b>
          <span>Start from an alert to include its evidence link.</span>
          <button
            className="button button-primary"
            onClick={() => p.go("Alerts")}
          >
            Review alerts <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
function SourcesPage(p: ContentProps) {
  const names = Array.from(new Set(demoEvents.map((e) => e.source)));
  return (
    <div className="content-area">
      <Heading
        kicker="Workspace / Sources"
        title="Sample sources"
        subtitle="These are bundled fixtures. Automatic source collection is not available in this demo."
      >
        <span className="sample-label">
          Synthetic fixtures · no connections
        </span>
      </Heading>
      <div className="source-callout">
        <LockKeyhole size={17} />
        <p>
          <b>Real telemetry is not accepted by this demo.</b> Hosted collection
          requires individual identity, workspace roles, privacy lifecycle controls
          and operational review. The separate private workspace is a local prototype.
        </p>
      </div>
      <div className="source-list">
        {names.map((name) => (
          <article className="panel source-card" key={name}>
            <span className="source-avatar">{name[0]}</span>
            <div className="source-description">
              <h2>{name}</h2>
              <p>
                {demoEvents.filter((e) => e.source === name).length} synthetic
                records · Example format for learning
              </p>
            </div>
            <span className="source-state">Fixture only</span>
            <button
              className="button button-secondary"
              onClick={() => {
                p.setSourceFilter(name);
                p.go("Explore");
              }}
            >
              View sample <ArrowRight size={13} />
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
function GuidePage(p: ContentProps) {
  return (
    <div className="content-area">
      <Heading
        kicker="Workspace / Learning"
        title="A repeatable investigation"
        subtitle="Use this practice guide to connect an alert to evidence and a documented decision."
      />
      <div className="guide-grid">
        {[
          [
            "1 · Validate the signal",
            "Check the source, timestamp, outcome, and whether the data is complete.",
          ],
          [
            "2 · Inspect evidence",
            "Open the linked event, compare its fields, and read the raw sample record.",
          ],
          [
            "3 · Add context",
            "Check the affected user and host, related activity, and expected changes.",
          ],
          [
            "4 · Record a decision",
            "Resolve the alert or create a case with a concise analyst note.",
          ],
        ].map(([title, body]) => (
          <article className="panel guide-card" key={title}>
            <span className="eyebrow">PRACTICE</span>
            <h2>{title}</h2>
            <p>{body}</p>
          </article>
        ))}
      </div>
      <button className="button button-primary" onClick={() => p.go("Alerts")}>
        Start with the alert queue <ArrowRight size={15} />
      </button>
      <div className="guide-note">
        <b>Learning note</b>
        <p>
          Use the event timeline to check context around the alert. Severity
          indicates potential impact; it does not indicate certainty. Record
          what you verified and what remains unknown.
        </p>
      </div>
    </div>
  );
}
function SettingsPage(p: ContentProps) {
  const [draft, setDraft] = useState(p.settings);
  useEffect(() => setDraft(p.settings), [p.settings]);
  return (
    <div className="content-area">
      <Heading
        kicker="Workspace / Settings"
        title="Workspace settings"
        subtitle="Preferences apply to this browser demo only."
      />
      <section className="panel settings-panel">
        <div className="setting-row">
          <div>
            <h2>Workspace name</h2>
            <p>Shown in navigation and page headings.</p>
          </div>
          <input
            aria-label="Workspace name"
            value={draft.workspace}
            maxLength={40}
            onChange={(e) => setDraft({ ...draft, workspace: e.target.value })}
          />
        </div>
        <div className="setting-row">
          <div>
            <h2>Sample retention label</h2>
            <p>Display preference only; bundled fixtures are not deleted.</p>
          </div>
          <select
            aria-label="Sample retention label"
            value={draft.retention}
            onChange={(e) => setDraft({ ...draft, retention: e.target.value })}
          >
            <option>7 days</option>
            <option>30 days</option>
            <option>90 days</option>
          </select>
        </div>
        <div className="setting-row">
          <div>
            <h2>Compact tables</h2>
            <p>Reduce event row height for denser scanning.</p>
          </div>
          <input
            aria-label="Compact tables"
            type="checkbox"
            checked={draft.dense}
            onChange={(e) => setDraft({ ...draft, dense: e.target.checked })}
          />
        </div>
        <div className="settings-warning">
          <LockKeyhole size={16} />
          <span>
            No account system, API keys, audit log, or live data store exists in
            this demo. These preferences do not change product security
            controls.
          </span>
        </div>
        <div className="settings-actions">
          <button
            className="button button-primary"
            onClick={() => {
              p.setSettings(draft);
              p.notify("Workspace preferences applied for this session.");
            }}
          >
            Save preferences
          </button>
          <button
            className="button button-secondary"
            onClick={() => {
              const defaults = {
                workspace: "Learning workspace",
                retention: "30 days",
                dense: false,
              };
              p.setSettings(defaults);
              setDraft(defaults);
              p.notify("Workspace preferences restored.");
            }}
          >
            Restore defaults
          </button>
        </div>
      </section>
      <section className="panel settings-panel">
        <div className="setting-row">
          <div>
            <h2>Dashboard appearance</h2>
            <p>Light or dark theme; saved in this browser.</p>
          </div>
          <button
            className="button button-secondary"
            onClick={() => p.setTheme(p.theme === "dark" ? "light" : "dark")}
            aria-label={`Switch to ${p.theme === "dark" ? "light" : "dark"} theme`}
          >
            Switch to {p.theme === "dark" ? "light" : "dark"} theme
          </button>
        </div>
        <div className="setting-row">
          <div>
            <h2>Reset sample activity</h2>
            <p>
              Clear this browser’s cases, alert changes, and saved searches.
            </p>
          </div>
          <button className="button button-secondary" onClick={p.resetDemo}>
            Reset demo data
          </button>
        </div>
      </section>
    </div>
  );
}
