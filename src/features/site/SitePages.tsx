import { useEffect } from "react";
import React from "react";
import { ArrowRight, Bell, Database, BookOpen, Download, ExternalLink, FileSearch, Github, LayoutDashboard, LockKeyhole, Menu, Search, Shield, ShieldAlert } from "lucide-react";
import gsap from "gsap";
import { Link, NavLink } from "react-router-dom";
import { demoEvents } from "../../data/demo";
import { appConfig } from "../../config";
import Brand from "../../components/Brand";
function SiteHeader() {
  return (
    <header className="site-header">
      <Brand />
      <nav aria-label="Main navigation">
        <NavLink to="/product">Product</NavLink>
        <NavLink to="/connections">Connections</NavLink>
        <NavLink to="/docs">Docs</NavLink>
        <NavLink to="/security">Security</NavLink>
        <NavLink to="/community">Community</NavLink>
      </nav>
      <div className="site-actions">
        <GithubLink />
        <Link to="/get-started" className="button button-primary">
          Get started <ArrowRight size={16} />
        </Link>
      </div>
      <details className="mobile-site-nav">
        <summary aria-label="Open navigation menu">
          <Menu size={21} />
        </summary>
        <nav aria-label="Mobile navigation">
          <NavLink to="/product">Product</NavLink>
          <NavLink to="/connections">Connections</NavLink>
          <NavLink to="/docs">Docs</NavLink>
          <NavLink to="/security">Security</NavLink>
          <NavLink to="/community">Community</NavLink>
          <Link to="/get-started" className="button button-primary">
            Get started <ArrowRight size={16} />
          </Link>
        </nav>
      </details>
    </header>
  );
}
function GithubLink({ large = false }: { large?: boolean }) {
  return appConfig.hasRepository ? (
    <a
      className={`button ${large ? "button-large" : ""} button-dark-outline`}
      href={appConfig.githubUrl}
      target="_blank"
      rel="noreferrer"
    >
      <Github size={17} /> View on GitHub <ExternalLink size={14} />
    </a>
  ) : (
    <Link
      className={`button ${large ? "button-large" : ""} button-dark-outline`}
      to="/community#project-source"
    >
      <Github size={17} /> GitHub project <ArrowRight size={14} />
    </Link>
  );
}
function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div>
          <Brand />
          <p>Open security monitoring, built in the open.</p>
        </div>
        <div className="footer-links">
          <span>Explore</span>
          <Link to="/product">Product</Link>
          <Link to="/get-started">Getting started</Link>
          <Link to="/connections">Connections</Link>
          <Link to="/roadmap">Roadmap</Link>
        </div>
        <div className="footer-links">
          <span>Project</span>
          <Link to="/security">Security</Link>
          <Link to="/community">Community</Link>
          <GithubLink />
        </div>
      </div>
      <div className="footer-bottom">
        <span>Veycord Sentinel · Early development</span>
        <span>Demo data is synthetic. Hosted telemetry is not available.</span>
      </div>
    </footer>
  );
}
function ProductPreview() {
  return (
    <div
      className="product-preview"
      aria-label="Preview of the Veycord Sentinel event investigation console"
    >
      <div className="preview-window">
        <div className="preview-top">
          <Brand />
          <span className="preview-demo-tag">SAMPLE WORKSPACE</span>
        </div>
        <div className="preview-layout">
          <div className="preview-nav">
            <b>Workspace</b>
            <span className="selected">
              <LayoutDashboard size={15} />
              Overview
            </span>
            <span>
              <Search size={15} />
              Explore events
            </span>
            <span>
              <ShieldAlert size={15} />
              Detections
            </span>
            <span>
              <Bell size={15} />
              Alerts
            </span>
            <span>
              <FileSearch size={15} />
              Cases
            </span>
          </div>
          <div className="preview-content">
            <div className="preview-title">
              <div>
                <small>WORKSPACE OVERVIEW</small>
                <h2>Security activity</h2>
              </div>
              <span>Last 24 hours</span>
            </div>
            <div className="preview-counts">
              <div>
                <small>Sample events</small>
                <b>8</b>
              </div>
              <div>
                <small>Open alerts</small>
                <b>3</b>
              </div>
              <div>
                <small>Detections</small>
                <b>4</b>
              </div>
            </div>
            <div className="preview-events">
              <div className="preview-section-title">
                <b>Recent events</b>
                <span>View all</span>
              </div>
              {demoEvents.slice(0, 3).map((event) => (
                <div className="preview-event" key={event.id}>
                  <i
                    className={`severity-dot ${event.severity.toLowerCase()}`}
                  />
                  <span>
                    <b>{event.event}</b>
                    <small>
                      {event.source} · {event.host}
                    </small>
                  </span>
                  <em>{event.time}</em>
                </div>
              ))}
            </div>
            <div className="preview-caption">
              Synthetic data · Example interface, not a live service
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export function Landing() {
  React.useEffect(() => {
    document.title = "Veycord Sentinel | Open security analytics";
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.from(".hero-copy > *", {
        y: 18,
        opacity: 0,
        duration: 0.65,
        stagger: 0.08,
        ease: "power2.out",
      });
      gsap.from(".product-preview", {
        y: 24,
        opacity: 0,
        duration: 0.8,
        delay: 0.18,
        ease: "power2.out",
      });
    });
    return () => ctx.revert();
  }, []);
  return (
    <>
      <main className="site-page">
        <SiteHeader />
        <section className="hero hero-editorial">
          <div className="hero-copy">
            <div className="eyebrow">
              Open-source security monitoring and investigation
            </div>
            <h1><span className="hero-headline-line">Security data.</span><span className="hero-headline-line">Clear decisions.</span></h1>
            <p className="hero-lede">
              Search events, investigate detections, and document cases in a
              workspace designed to be approachable, self-hostable, and open
              source.
            </p>
            <div className="hero-buttons">
              <Link to="/demo" className="button button-primary button-large">
                Try the web demo <ArrowRight size={17} />
              </Link>
              <Link
                to="/get-started#self-host"
                className="button button-outline button-large"
              >
                Download and self-host <Download size={16} />
              </Link>
            </div>
            <p className="hero-disclosure">
              No account required. The demo runs on synthetic sample events in
              your browser.
            </p>
            <Link className="hero-connection-link" to="/connections">Set up a data connection <ArrowRight size={15} /></Link>
          </div>
          <ProductPreview />
        </section>
        <div className="proof-strip">
          <span>BUILT FOR PRACTICAL SECURITY WORK</span>
          <div>
            <Search />
            Search normalized events
          </div>
          <div>
            <ShieldAlert />
            Understand detections
          </div>
          <div>
            <FileSearch />
            Document investigations
          </div>
        </div>
        <section className="site-section intro-section" id="product">
          <div className="section-heading">
            <span className="eyebrow">A CLEAR PATH THROUGH THE WORK</span>
            <h2>
              From an event to an
              <br />
              investigation you can explain.
            </h2>
          </div>
          <p className="section-copy">
            Security tools should help you see the evidence and make a
            decision—not hide the workflow behind a query language or a maze of
            screens.
          </p>
          <div className="workflow-grid">
            <article>
              <span className="step-index">01</span>
              <Search />
              <h3>Search the activity</h3>
              <p>
                Filter sample records by event, source, host, user, IP address,
                or severity. Open a result to inspect normalized fields and raw
                evidence.
              </p>
              <Link to="/demo">
                Explore events <ArrowRight />
              </Link>
            </article>
            <article>
              <span className="step-index">02</span>
              <ShieldAlert />
              <h3>Review the signal</h3>
              <p>
                See why a starter detection matched, what it can’t tell you, and
                which checks can help validate the activity.
              </p>
              <Link to="/demo">
                Review detections <ArrowRight />
              </Link>
            </article>
            <article>
              <span className="step-index">03</span>
              <FileSearch />
              <h3>Keep the context</h3>
              <p>
                Resolve an alert or create a case linked to the underlying event
                so the investigation has an understandable trail.
              </p>
              <Link to="/demo">
                Open the demo <ArrowRight />
              </Link>
            </article>
          </div>
        </section>
        <section className="site-section principles-section">
          <div className="section-heading">
            <span className="eyebrow">OPEN BY DEFAULT</span>
            <h2>
              Built around control,
              <br />
              clarity, and learning.
            </h2>
          </div>
          <div className="principle-list">
            <article>
              <b>Free to run</b>
              <p>
                The planned core has no event cap or feature expiry. Run it
                yourself without a required hosted account.
              </p>
            </article>
            <article>
              <b>Local-first path</b>
              <p>
                Begin with synthetic data. Self-hosted operation is a
                first-class goal for teams that need to keep data on their own
                infrastructure.
              </p>
            </article>
            <article>
              <b>Explainable detections</b>
              <p>
                Rules should expose rationale, evidence, provenance, and likely
                false positives—not just a severity badge.
              </p>
            </article>
            <article>
              <b>Evidence over claims</b>
              <p>
                Security controls, known gaps, and operational limits should be
                documented and reviewable as the project grows.
              </p>
            </article>
          </div>
          <Link className="text-button" to="/product">
            See product scope and current status <ArrowRight size={16} />
          </Link>
        </section>
        <section className="architecture-band">
          <div>
            <span className="eyebrow">A PORTABLE STARTING POINT</span>
            <h2>
              Built for a real
              <br />
              self-hosting path.
            </h2>
            <p>
              React and TypeScript for the console. A Cloudflare Worker API is
              the current hosted-path proposal. The search and detection engine
              remains a benchmark decision.
            </p>
            <Link to="/product" className="button button-outline">
              Read the architecture direction <ArrowRight size={15} />
            </Link>
          </div>
          <div className="architecture-flow">
            <div>
              <b>Sources</b>
              <span>Linux · Windows · Network</span>
            </div>
            <i />
            <div>
              <b>Collect and normalize</b>
              <span>OpenTelemetry candidate</span>
            </div>
            <i />
            <div>
              <b>Search and detect</b>
              <span>Backend under benchmark</span>
            </div>
            <i />
            <div>
              <b>Investigate</b>
              <span>Events · Alerts · Cases</span>
            </div>
            <small>
              Proposed architecture · not yet implemented end to end
            </small>
          </div>
        </section>
        <section className="github-callout" id="project-source">
          <div>
            <span className="eyebrow">FOLLOW THE BUILD</span>
            <h2>
              Make security tooling
              <br />
              more open and teachable.
            </h2>
            <p>
              Explore the demo, run your own workspace, or help improve the
              source on GitHub. The project is Apache-2.0 licensed, with
              architecture decisions and known limits open for review.
            </p>
          </div>
          <div className="github-actions">
            <Link to="/demo" className="button button-primary button-large">
              Try the interactive demo <ArrowRight size={17} />
            </Link>
            <GithubLink large />
            <span>
              {appConfig.hasRepository
                ? "Source code and project history"
                : "GitHub source will be linked when the public repository is ready"}
            </span>
          </div>
        </section>
        <SiteFooter />
      </main>
    </>
  );
}

export function PageFrame({
  eyebrow,
  title,
  lead,
  children,
  compact = false,
}: {
  compact?: boolean;
  eyebrow: string;
  title: string;
  lead: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.title = `${eyebrow[0] + eyebrow.slice(1).toLowerCase()} | Veycord Sentinel`;
  }, [eyebrow]);
  return (
    <main className={`site-page${compact ? " site-page--workspace" : ""}`}>
      <SiteHeader />
      <section className="inner-hero">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{lead}</p>
      </section>
      <div className="inner-content">{children}</div>
      <SiteFooter />
    </main>
  );
}
export function ProductPage() {
  return (
    <PageFrame
      eyebrow="PRODUCT"
      title="An investigation workflow you can follow."
      lead="Veycord Sentinel is an open-source security monitoring workbench in early development. The current browser demo shows the intended analyst workflow using synthetic data."
    >
      <div className="page-feature-grid">
        {[
          [
            "Event search",
            "Search fixture records by host, user, source, IP, or severity. Inspect normalized fields and the raw sample record.",
          ],
          [
            "Detections",
            "Read rule rationale, limitations, recommended checks, and linked event evidence.",
          ],
          [
            "Alerts",
            "Review the queue, resolve or reopen an alert, and create a linked case.",
          ],
          [
            "Cases",
            "Keep a browser-local record of investigation context and linked alerts.",
          ],
          [
            "Sources",
            "Inspect sample source families, then follow the private HTTP setup for a self-hosted workspace. Managed source collectors are planned.",
          ],
          [
            "Workspace settings",
            "Change browser-only preferences and reset the sample state.",
          ],
        ].map(([title, body]) => (
          <article key={title}>
            <h2>{title}</h2>
            <p>{body}</p>
            <Link to="/demo">
              Try it in the demo <ArrowRight size={15} />
            </Link>
          </article>
        ))}
      </div>
      <div className="notice-block">
        <LockKeyhole />
        <p>
          <b>Current boundary</b>
          <br />
          The console uses bundled synthetic records and local browser state. It
          is separate from the optional private Node/PostgreSQL workspace. The
          private API supports bounded authenticated JSON ingestion; hosted
          accounts, tenant membership and managed collectors remain pending.
        </p>
      </div>
      <h2 className="subheading">Architecture direction</h2>
      <p className="wide-copy">
        React + TypeScript + Vite is the selected console framework. Cloudflare
        Workers with Hono serve the public synthetic API. The private data path
        runs on Node and PostgreSQL. OpenSearch Security
        Analytics and ClickHouse remain under workload benchmark before
        selecting a data engine. See the project brain for detailed architecture
        and release gates.
      </p>
      <div className="inline-links">
        <Link to="/roadmap">See the roadmap</Link>
        <Link to="/security">See security requirements</Link>
        <Link to="/docs">Get started with the sample</Link>
      </div>
    </PageFrame>
  );
}
export function DocsPage() {
  return (
    <PageFrame
      eyebrow="DOCUMENTATION"
      title="Start with the sample workspace."
      lead="No install or account is needed for the browser demo. Follow a guided investigation, or configure a private workspace backed by PostgreSQL."
    >
      <div className="docs-layout">
        <aside className="docs-toc">
          <b>On this page</b>
          <a href="#demo">Try the demo</a>
          <a href="#walkthrough">Investigation walkthrough</a>
          <a href="#self-host">Run locally</a>
          <a href="#api">API contract</a>
          <a href="#limits">Demo limitations</a>
        </aside>
        <div className="docs-article">
          <section id="demo">
            <h2>Try the interactive demo</h2>
            <p>
              The demo contains deterministic, synthetic security records using
              reserved example IP ranges. State changes stay in your browser.
            </p>
            <Link className="button button-primary" to="/demo">
              Start the demo <ArrowRight size={16} />
            </Link>
          </section>
          <section id="walkthrough">
            <h2>Practice an investigation</h2>
            <ol>
              <li>Search Explore for a host, user, source, or severity.</li>
              <li>
                Open a matching event and compare normalized fields with the raw
                record.
              </li>
              <li>
                Review its linked detection. Read the reason and the next
                checks.
              </li>
              <li>
                Resolve the alert or create a case linked to its evidence.
              </li>
              <li>
                Reset the demo from the top bar to restore the original state.
              </li>
            </ol>
          </section>
          <section id="self-host">
            <h2>Run the project locally</h2>
            <p>The source checkout currently needs Node.js and npm.</p>
            <pre>
              <code>
                npm install
                <br />
                npm run dev
              </code>
            </pre>
            <p>
              The public console uses synthetic data. The optional private workspace stores events, detection findings, and cases in PostgreSQL. Follow docs/PRIVATE-WORKSPACE.md in the checkout to configure the separate runtime role and service key. The database Compose file is a local development setup.
            </p>
          </section>
          <section id="private-workspace">
            <h2>Use your private workspace</h2>
            <p>The service must be configured before connecting. The public demo never reads your database. A shared service key grants operator access; use a private environment while stronger identity and operational controls are being built.</p>
            <Link className="button button-primary" to="/workspace">Open private workspace <Database size={16}/></Link>
          </section>
          <section id="api">
            <h2>API reference and request explorer</h2>
            <p>The development server and public Worker deployment expose a read-only API over synthetic fixtures. It returns no customer data and has no accounts or ingest endpoint. A static-only deployment does not include this API.</p>
            <div className="api-route-list">
              <div><code>GET /api/v1/health</code><span>Demo mode and unauthenticated status.</span></div>
              <div><code>GET /api/v1/events</code><span>Validated fixture search with bounded pages, filters and cursors.</span></div>
              <div><code>GET /api/v1/events/:id</code><span>One synthetic event and its evidence fields.</span></div>
              <div><code>GET /api/v1/detections</code><span>Starter detection metadata and analyst guidance.</span></div>
            </div>
            <Link className="button button-primary" to="/docs/api">Try the API request explorer <ArrowRight size={16}/></Link>
            <p>The separate private API accepts bounded event batches and persists findings and cases behind a server-configured service key. This is a single-operator foundation; interactive identity and corporate roles remain pending. See docs/PRIVATE-API.md and <code>docs/API-v1.md</code>.</p>
          </section>
          <section id="limits">
            <h2>Know what this demo does not do</h2>
            <p>
              It does not accept logs, authenticate users, provide tenant
              isolation, store data on a server, run real detection rules, or
              connect live sources. It runs on Cloudflare with synthetic fixtures. Do not submit real telemetry.
            </p>
            <Link to="/security">
              Read security status <ArrowRight size={15} />
            </Link>
          </section>
        </div>
      </div>
    </PageFrame>
  );
}
export function RoadmapPage() {
  const phases = [
    [
      "Now",
      "Product and learning prototype",
      "Landing pages, synthetic investigation walkthrough, product research brain, framework decision.",
    ],
    [
      "Next",
      "Local end-to-end data path",
      "Bounded event intake, normalization, local storage/search, one tested detection, alert evidence, case record.",
    ],
    [
      "After that",
      "Self-hosted small-team release",
      "Containerized install, first supported sources, basic access control, audit and retention behaviors, backup and upgrade guidance.",
    ],
    [
      "Later, gated",
      "Optional hosted real-data workspaces",
      "Identity, tenant isolation, privacy, deletion, cost control, operations review, and independent security evidence before any pilot.",
    ],
  ];
  return (
    <PageFrame
      eyebrow="ROADMAP"
      title="A practical path, with gates."
      lead="The roadmap prioritizes an end-to-end local workflow first. Hosted real telemetry stays behind security, privacy, and cost evidence."
    >
      <div className="roadmap-list">
        {phases.map(([when, title, body]) => (
          <article key={when}>
            <span>{when}</span>
            <div>
              <h2>{title}</h2>
              <p>{body}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="notice-block">
        <Shield />
        <p>
          <b>Scope decision</b>
          <br />
          Firewall enforcement, silent automated response, SPL compatibility,
          and multi-node scale are outside the initial product scope.
        </p>
      </div>
      <Link to="/demo" className="button button-primary">
        Try what exists today <ArrowRight size={15} />
      </Link>
    </PageFrame>
  );
}
export function SecurityPage() {
  return (
    <PageFrame
      eyebrow="SECURITY"
      title="Security work should be inspectable."
      lead="Veycord Sentinel is a prototype, not a production security service. This page distinguishes current behavior from the controls still required."
    >
      <div className="status-table">
        <div>
          <b>Demo data</b>
          <span>Synthetic fixtures only. No log upload route.</span>
          <em className="status-ready">Available</em>
        </div>
        <div>
          <b>Browser state</b>
          <span>Alerts and cases remain in this browser's local storage.</span>
          <em className="status-ready">Local only</em>
        </div>
        <div>
          <b>Authentication and roles</b>
          <span>Private workspace uses a server-configured operator key. Interactive user accounts and roles are pending.</span>
          <em className="status-planned">Not implemented</em>
        </div>
        <div>
          <b>Hosted ingestion</b>
          <span>Private bounded ingestion and PostgreSQL persistence are implemented locally. A hosted telemetry service is not available.</span>
          <em className="status-planned">Not available</em>
        </div>
        <div>
          <b>Security verification</b>
          <span>
            ASVS-aligned control evidence and independent review remain future
            gates.
          </span>
          <em className="status-planned">Planned</em>
        </div>
      </div>
      <p className="wide-copy">Report sensitive findings through <a href={`${appConfig.githubUrl}/security/advisories/new`} target="_blank" rel="noreferrer">GitHub private vulnerability reporting</a>. Do not include customer data or credentials.</p>
      <h2 className="subheading">Before real telemetry is accepted</h2>
      <ul className="security-list">
        <li>
          Verified identity and server-side authorization for every tenant-bound
          operation.
        </li>
        <li>Input, query, retention, concurrency, and cost limits.</li>
        <li>
          Privacy inventory, deletion behavior, residency/subprocessor
          disclosures, and POPIA review.
        </li>
        <li>
          Cross-tenant, export, queued-work, and recovery testing; independent
          security assessment.
        </li>
      </ul>
      <h2 className="subheading">Cisco practices and certification</h2>
      <p className="wide-copy">
        Sentinel is not Cisco certified. Cisco’s public development guidance is a
        reference for our threat modeling, review, testing and vulnerability response.
        Certification would require a defined assessment program, scope and successful
        external evaluation. <a href={`${appConfig.githubUrl}/blob/main/docs/security/ASSURANCE-MATRIX.md`} target="_blank" rel="noreferrer">Read our current assurance evidence and open gaps.</a>
      </p>
      <h2 className="subheading">Security lifecycle we are building toward</h2>
      <p className="wide-copy">
        Cisco describes a lifecycle spanning planning, development, validation,
        launch, operation, and monitoring, supported by threat modeling,
        security requirements, vulnerability testing, and ongoing updates. We
        are using those principles as a maturity reference and translating them
        into evidence gates for this small open-source project; this is not
        Cisco certification or equivalent assurance.
      </p>
      <div className="security-lifecycle">
        {[
          [
            "Plan",
            "Threat model, privacy review, abuse cases, security requirements, and explicit trust boundaries.",
          ],
          [
            "Develop",
            "Secure defaults, reviewed dependencies, secret handling, least privilege, and automated code analysis.",
          ],
          [
            "Validate",
            "Unit and integration tests, dependency/container scans, fuzzing of parsers, and authorization tests.",
          ],
          [
            "Release",
            "Signed builds, SBOM/provenance, reproducible release process, documented known issues, and rollback plan.",
          ],
          [
            "Operate",
            "Hardening guidance, supported versions, backup/restore, logging without sensitive payloads, and incident playbooks.",
          ],
          [
            "Monitor",
            "Coordinated vulnerability disclosure, patch targets, advisories, dependency updates, and end-of-life policy.",
          ],
        ].map(([phase, body]) => (
          <article key={phase}>
            <b>{phase}</b>
            <p>{body}</p>
          </article>
        ))}
      </div>
      <p className="wide-copy">
        The project does not claim POPIA compliance, government approval, or
        production readiness.
      </p>
      <p className="source-links">
        Reference:{" "}
        <a
          href="https://www.cisco.com/c/en/us/products/collateral/servers-unified-computing/compute-security-hardening-guide-standalone-wp.html"
          target="_blank"
          rel="noreferrer"
        >
          Cisco Secure Development Lifecycle overview
        </a>{" "}
        ·{" "}
        <a
          href="https://blogs.cisco.com/security/always-on-assurance"
          target="_blank"
          rel="noreferrer"
        >
          Cisco on continuous security assurance
        </a>
      </p>
      <Link to="/docs">
        Review demo boundaries <ArrowRight size={15} />
      </Link>
    </PageFrame>
  );
}
export function CommunityPage() {
  return (
    <PageFrame
      eyebrow="COMMUNITY"
      title="Help shape the first release."
      lead="Veycord Sentinel is early-stage. Contributions are most useful when they improve a real user workflow, strengthen a documented control, or make the project easier to run."
    >
      <div className="community-grid">
        <article>
          <Github />
          <h2>Source repository</h2>
          <p>
            {appConfig.hasRepository
              ? "Browse the code, issues, and release notes."
              : "The public repository is being prepared. The GitHub link will be activated when the project is published."}
          </p>
          <GithubLink />
        </article>
        <article>
          <BookOpen />
          <h2>Read the project brain</h2>
          <p>
            The Obsidian-compatible product brain records research, architecture
            proposals, security gates, and open decisions.
          </p>
          <Link to="/product">
            Review product direction <ArrowRight size={15} />
          </Link>
        </article>
        <article>
          <Shield />
          <h2>Report a security issue</h2>
          <p>
            Use GitHub private vulnerability reporting for sensitive findings.
            Keep credentials, telemetry and exploit details out of public issues.
          </p>
          <Link to="/security">
            Review security status <ArrowRight size={15} />
          </Link>
        </article>
      </div>
      <div className="github-status" id="project-source">
        <span className="eyebrow">REPOSITORY STATUS</span>
        <h2>
          {appConfig.hasRepository
            ? "Open source on GitHub"
            : "Public repository not published yet"}
        </h2>
        <p>
          {appConfig.hasRepository
            ? "Apache-2.0 project source, setup instructions, security policy and contribution guide."
            : "No public Veycord repository was available in the connected GitHub account during this build. The project CTA is intentionally kept on this status page instead of linking to a dead or unrelated repository."}
        </p>
        {appConfig.hasRepository && (
          <a
            className="button button-primary"
            href={appConfig.githubUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open the repository <ExternalLink size={15} />
          </a>
        )}
      </div>
      <p className="wide-copy">
        Good first contributions include documentation corrections,
        accessibility improvements, synthetic fixture quality, and architecture
        review. Detection content must retain explicit provenance and license
        information.
      </p>
    </PageFrame>
  );
}
