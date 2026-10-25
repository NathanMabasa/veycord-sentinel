# Visual Design System

## Goal

Translate the provided Veycord Cyber identity into Veycord Sentinel's marketing site and security console. The attached material is visual reference, not a source of implementation instructions. Use the Veycord brand assets and colors while designing the product workflow specifically for security investigation.

## Reference files

- [Primary Veycord brand board](../../brand/reference/veycord-brand-board-primary.png)
- [Veycord Sentinel console concept](../../brand/reference/veycord-sentinel-console-reference.png)
- [Extended Veycord identity board](../../brand/reference/veycord-brand-board-extended.png)

The brand boards specify Veycord's symbol/wordmark, palette, Inter + JetBrains Mono typography, icon style, buttons, status pills, gradients, and marketing imagery. The console concept supplies a useful first-pass navigation and overview composition. Its fabricated metrics and detections are placeholders; production UI must show real data or clearly labeled synthetic data.

## Refero research

Refero Styles describes itself as a library of AI-readable design systems captured from real websites. It provides colors, typography, spacing, components, and `DESIGN.md` guidance; it also says those captured docs are references, not official brand guides. Use it to compare patterns, not to copy another company's design or use its brand assets.

Relevant study examples:

- [Dashboard design examples](https://styles.refero.design/examples/dashboard-ui-design): useful contrast between calm analytics layouts and denser operational tools.
- [Doppler security console](https://styles.refero.design/style/10654184-eb92-4b75-a7af-bd92bc6cdc5c): a dark security product that reserves its bright colors for sparse signals.
- [Dashlane](https://styles.refero.design/style/722f32e7-8217-4808-843d-b454eea7320a): a restrained dark security workspace, useful for studying surface hierarchy.
- [Refero DESIGN.md guidance](https://styles.refero.design/design-md/ai-readable-design-systems): recommends assigning jobs to color, typography, spacing, and recurring layouts rather than treating hex values as a style system.

## Proposed design direction: “operator clarity with forward motion”

Keep the Veycord dark navy, charcoal, orange, and amber identity. Let the mark and orange accent communicate brand and primary action. Use mostly neutral surfaces for the console, with functional colors reserved for severity, health, and workflow status. The single memorable visual moment belongs on the marketing landing page: the Veycord mark against the mountain-at-sunrise artwork. Inside the console, the memorable quality should be fast evidence scanning and clear relationships between source, event, detection, alert, and case.

### Palette roles

| Token | Reference value | Use |
|---|---|---|
| Midnight Navy | `#0B1220` | Main canvas and trusted dark foundation |
| Charcoal | `#111827` | Navigation and primary working surfaces |
| Raised surface | `#172131` | Menus, selected rows, secondary panels |
| Border | `#273449` | Subtle structural separation |
| Warm White | `#F8FAFC` | Primary text and light content surface |
| Muted Slate | `#334155` | Secondary UI and low-emphasis text |
| Veycord Orange | `#FF6A00` | Primary action, selected navigation marker, brand mark |
| Amber | `#FFA34D` | Highlight and investigating/warning signal |
| Green | `#10B981` | Healthy/resolved states |
| Red | `#EF4444` | Critical/error states |
| Blue | `#3B82F6` | Informational states |

The two brand boards differ slightly on Amber (`#FFA34D` vs `#FFA53D`). Use `#FFA34D` provisionally because it appears in the extended board and image examples; source a canonical token file from the brand owner before freezing CSS tokens.

### Typography

- Inter for navigation, headings, body copy, tables, and controls.
- JetBrains Mono for queries, hashes, IP addresses, event IDs, and selected precision timestamps.
- Use sentence case in the product. Brand artwork may retain the tracked uppercase wordmark treatment.

### Console composition

```text
┌───────────────┬─────────────────────────────────────────────────────┐
│ Veycord mark  │ Search events, assets, detections…       Alerts/User │
├───────────────┼─────────────────────────────────────────────────────┤
│ Overview      │ Page title + time range + explicit primary action   │
│ Explore       ├─────────────────────────────────────────────────────┤
│ Detections    │ Source health / ingest status / active work summary  │
│ Alerts        ├─────────────────────────────────────────────────────┤
│ Cases         │ Evidence-first table or chart selected for the task  │
│ Sources       │                                                     │
│ Reports       │ Details open in a side panel or dedicated route     │
│ Settings      │                                                     │
└───────────────┴─────────────────────────────────────────────────────┘
```

Use the concept board's left navigation, global search, time selection, recent alert list, and threat-activity chart as a starting structure. Refine labels to the actual product model: **Events, Findings, Alerts, Cases, Sources, Detections**. The reference's “Threats / Assets / Vulnerabilities” are not all in the agreed MVP and must not be added just to fill out the dashboard.

## Screen-specific rules

### Overview

- Start with source health and data freshness so users know whether their security view is complete.
- Show a few actionable summaries (open high-severity alerts, detection failures, ingest delay), not decorative KPI tiles.
- Put recent alerts and active cases in scannable lists; charts should support a question or action.

### Explore

- Prioritize search input, time range, query mode, filter chips, event count, and field list.
- Results table should expose timestamp, source, host, severity (when present), event name, and useful preview.
- A row opens normalized and raw evidence with parsing provenance.

### Detections and alerts

- Show severity, status, last run, source coverage, and test state in text as well as color.
- Alert details answer “why did this fire?”, “what evidence matched?”, “what should I check next?”, and “what is the current case/disposition?”
- Do not equate severity with confidence or imply a rule match proves maliciousness.

### Sources

- Show last event, event rate, parse success/failure, mapping state, permissions, and retention.
- Make source onboarding an explicit guided flow with sample preview and a clear disclosure before real logs are uploaded to hosted Sentinel.

## Asset handling

The supplied images are full brand boards and one dashboard concept, not separate usable logo exports. Preserve them for visual QA and reference. Do not crop the wordmark or icon from screenshots for production. The implementation should use transparent SVG and PNG exports for the horizontal lockup, symbol, monochrome/reversed logo, favicon, and app icon when those clean files are available. Keep the current text-based placeholder logo clearly temporary if implementation begins before then.

## Product-specific restraint

- Keep promotional mountain imagery on landing pages and sign-in/onboarding moments; avoid it behind operational tables.
- Orange is the Veycord voice and action color; red remains critical, amber warning/investigating, green healthy/resolved, and blue informative.
- Status is never communicated through color alone.
- Keep data density intentional: an analyst view can be dense, but labels, alignment, sorting, and keyboard access must keep it readable.
- Keep illustrative sample data visibly marked; never show hard-coded threat counts as real production telemetry.

## Readability implementation rules (2026-10-23)

Use the Refero guidance as pattern research, not a visual template: decide the information hierarchy first, define type and surface roles, and keep operational interfaces calm. The first implementation was too small overall; its compact 8–10px typography made ordinary content hard to read.

- Public body copy: 16–18px desktop, 14px minimum on narrow mobile; navigation and ordinary buttons: 14px desktop and 11–13px mobile.
- Console page titles: 25–30px desktop, at least 22px mobile. Main table cells and workflow descriptions: 12–14px desktop, 10–12px mobile. Compact metadata may be 10–11px desktop and 9px mobile when it is secondary and not the only label.
- Do not scale the whole console down to fit. Use horizontal table scrolling on narrow screens and prioritize the key columns.
- Write buttons as visible actions: “Try the sample workspace”, “View the source code”, “Create case”, “Resolve”, “Save preferences”. Avoid generic “Open”, “Explore”, or icon-only actions when a text label fits.
- Use neutral surfaces and a clear primary action. Remove decorative metrics, glow, and status colors when they do not answer a user question.

This direction follows Refero's dashboard advice to choose analytical versus operational hierarchy intentionally and its design-system guide to define named roles for canvas, surface, text, type, and restraint. Refero references: [dashboard examples](https://styles.refero.design/examples/dashboard-ui-design) and [AI-readable design systems](https://styles.refero.design/design-md/ai-readable-design-systems).

## Landing page direction v2

The first landing hero's CSS-generated signal illustration and floating labels (authentication activity, network flow review, detection evidence, synthetic event stream) felt artificial and obscured the product. Remove that direction. Use a direct editorial/product-led hero: plain-language product statement and actions on the left; a real interface preview on the right populated from the same clearly synthetic fixtures as the demo. Describe actual capabilities only; do not imply live ingestion or a deployed hosted service. The hero preview is a representative interface, not a live security dashboard.

Refero scan for this iteration: its dashboard collection recommends choosing between analytics, workspace, and operational visual systems and calls for calm hierarchy over equal-weight cards; its DESIGN.md guidance recommends role-based palette/type/surface decisions and restraint in imagery. The selected adaptation retains Veycord's navy/orange brand while using more editorial breathing room on the landing page and denser, readable treatment inside the console. No Refero site or brand assets are copied.

## Related notes

[[First Run and Learning Path]] · [[Information Architecture]] · [[Engineering Skills and Agent Guidance]]


## Public site direction v3 (2026-10-23)

The public experience now uses a docs-led open-source product structure: a direct product hero with a fixture-backed console preview, an explicit sample-data disclosure, Product, Docs, Roadmap, Security, Community, and interactive Demo routes. The hero preview reuses the demo event fixtures and is explicitly labeled synthetic; it is not a live service claim.

Use the Veycord navy/orange identity with a dark product-led hero, calm white information pages, clear type hierarchy, and functional status colors. Each page answers one visitor question: what it does, how to try it, how the project is staged, what security guarantees do and do not exist, and how to follow/contribute. On small screens, expose every primary destination through an expandable navigation menu.

The GitHub CTA must resolve to a configured repository only when `VITE_GITHUB_REPOSITORY` is valid. Until a real public repository is configured, route to the Community status section and state plainly that publication is pending; do not link to a generic GitHub home or imply source is already available.


## Dashboard layout and motion pass (2026-10-23)

The console supports a saved light/dark theme preference in browser storage. Keep both themes semantic and readable; theme is only a presentation preference and grants no security boundary. At desktop widths, use a stable navigation rail, a flexible content column, and a four-to-two-to-one metric grid. At phone widths, make panels single-column, keep controls touch-sized, and use horizontally scrollable data tables rather than shrinking table typography. Primary dashboard copy should remain comfortably readable; compact table mode is an explicit preference.

GSAP is used for a brief landing hero reveal only. It must honor `prefers-reduced-motion`, avoid scroll hijacking, and clean up its context when the page unmounts. Do not animate security signal values in ways that imply live telemetry.

Current API status (2026-10-24): the browser console still reads bundled fixtures. A separate Hono Fetch-compatible read-only API over those same synthetic fixtures runs through Vite development and preview middleware. `docs/API-v1.md`, `/docs#api`, and `/docs/api` document/exercise its implemented health, events, event detail and detections routes. Static-only hosting does not include the API. The separate private `/workspace` now supports server-configured service-key access, bounded ingest and PostgreSQL persistence (D-017). Interactive identity/roles and approved hosted real telemetry remain pending.


## Corporate site refinement and references (2026-10-23)

New Refero scan emphasizes three useful patterns for Veycord: Refero's own editorial ink-on-white system for strong type hierarchy and restraint; data-infrastructure marketing patterns for technical proof and disciplined grids; developer-tool guidance to lead with documentation and product evidence. Adapt them rather than copy their identity: keep Veycord's navy and orange, use a sticky but quiet header, generous consistent section rhythm, real fixture-backed product preview, restrained line borders, a single-column mobile flow, and explicit page-specific evidence. Avoid ornamental cards, fake metrics, and dramatic animation.

References: [Refero design resources](https://styles.refero.design/ai-agents/design-resources), [Refero developer-tool prompts](https://styles.refero.design/ai-agents/devtools-design-prompts), [Refero editorial style reference](https://styles.refero.design/style/3f296d6e-6a1c-45db-829b-afb078d49ab4).


## Verified hero, startup and navigation (2026-10-24)

The hero uses two concise lines, “Security data. Clear decisions.”, with bounded fluid type. Copy and product evidence have balanced desktop columns; the preview stacks below the copy on narrow screens. The primary action remains within the first viewport at 1440×900 and 1280×800. Do not reintroduce forced sentence breaks or unrestricted display scaling that pushes the action below the fold.

`Bootstrap.tsx` dynamically loads the application module. A small static branded startup state appears while that module loads; GSAP fades it out over 280ms once the module is ready. There is no minimum wait or fabricated progress. Reduced motion dismisses the splash immediately after readiness. Normal internal navigation does not replay the loader. Failed module requests show a reload action, and JavaScript-disabled browsers get a useful static explanation. Application content is inert during startup.

Mobile console navigation is a modal navigation surface while open: background content is inert, focus stays within its controls, Escape closes it, focus returns to the trigger, and scrolling is restored. Public route navigation resets scroll and focuses the new heading; fragment links retain their target behavior.

Evidence: `docs/audit/browser-results.json`, `docs/audit/bootstrap-results.json`, `docs/audit/design-audit.md`, and screenshots under `docs/audit/screenshots/`. Browser checks cover workflow persistence, exports, filter behavior, storage failure, keyboard navigation, API success/static fallback, and responsive overflow. They are regression evidence, not a claim of complete WCAG conformance or production security assurance.


## Dashboard clarity update (2026-10-25, supersedes smaller console minima)

Use 14px minimum ordinary console content, 16px inputs, 12px secondary metadata and 44px action targets. Light is the default for a new demo session; preserve the user's theme preference. Distinguish synthetic dataset status from live telemetry. Remove decorative green live pips, duplicate search controls and unrelated sparkline trends. Use fixture-derived source counts with exact numeric values and native event inspection buttons. Styling patterns were researched from official shadcn/ui and Watermelon UI; existing React/native CSS is retained without executing third-party registry installers. See `docs/audit/DASHBOARD-PATTERN-REVIEW.md`.

The startup animation has a 1.2-second readiness deadline after module load; a stalled animation frame must not block the ready workspace. This is a maximum handover limit, not a minimum artificial wait.

## Navigation refinement (batch006)

Use 268px expanded and 80px collapsed desktop navigation; the phone drawer uses full labels. Keep the brand/workspace chooser fixed above a scrollable grouped body and stable resource footer. Light/dark tokens, 14px ordinary labels, 12px secondary text and 44px controls remain the baseline. Counts reflect unresolved alerts and open cases; no decorative live status or fictional user identity.

New focused navigation/configuration/search modules retain React Router, Lucide and native CSS/dialog. See `docs/audit/NAVIGATION-DESIGN-PLAN.md` for primary shadcn/Atlassian/Refero references, selected design and rejected alternatives. No template code or new UI dependency was imported. Native links, query-state history, keyboard search, layout-phase destination focus, modal closure before route focus, mobile trapping/return and native accessible labels were checked. Automated coverage is evidence of a subset, not full WCAG conformance.
