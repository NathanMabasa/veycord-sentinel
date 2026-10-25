# Veycord Sentinel Design Direction

This is the implementation-facing visual guide for the product UI. For the rationale and screen-level guidance, read [Visual Design System](docs/brain/05-UX/Visual%20Design%20System.md). The supplied reference boards are in [docs/brand/reference](docs/brand/reference/).

## Product feel

Veycord Sentinel should feel like a calm, trustworthy security operations console: precise enough for analysts, legible to a learner, and restrained under pressure. Veycord's orange mark is the recognizable brand accent; it should not color every chart, alert, and button.

## Brand assets

- Preserve and use the Veycord symbol and wordmark from the provided brand package when clean asset files are available.
- Use horizontal lockup in the public site header and a compact symbol in the application sidebar/app icon.
- Do not crop the mark out of a brand-board screenshot for production use. Request/export transparent SVG and PNG assets in light/dark variants, plus favicon/app-icon sizes.
- Keep the slogan and scenic mountain artwork for marketing pages; do not place decorative banners behind operational data tables.

## Tokens

```css
:root {
  color-scheme: dark;
  --vc-canvas: #0B1220;
  --vc-sidebar: #0A101B;
  --vc-surface: #111827;
  --vc-surface-raised: #172131;
  --vc-border: #273449;
  --vc-text: #F8FAFC;
  --vc-text-muted: #A9B5C7;
  --vc-text-subtle: #7F8CA1;
  --vc-orange: #FF6A00;
  --vc-amber: #FFA34D;
  --vc-slate: #334155;
  --vc-success: #10B981;
  --vc-warning: #F59E0B;
  --vc-danger: #EF4444;
  --vc-info: #3B82F6;
  --vc-radius-control: 8px;
  --vc-radius-panel: 12px;
  --vc-space-unit: 4px;
}
```

The token names indicate roles. Keep severity colors semantic: orange is brand/action, red is critical, amber is warning/investigating, green is resolved/healthy, and blue is informational. Always pair color with text/icon/state so status is not color-only.

## Type

- Interface and headings: Inter (or Inter Variable), with readable weights and sentence case.
- Event IDs, timestamps where precision matters, query text, IPs, hashes, and code: JetBrains Mono.
- Reserve monospaced type for technical values; do not set every table label in mono.

## Layout

- Desktop console: 268px navigation rail with an optional 80px icon mode, compact top command/search bar, flexible content region.
- Main content max width: 1600px for dashboards and full-width investigation tables; use denser layouts when evidence scanning benefits.
- Use a 4px base spacing scale; 16px standard content gap, 24px section gap, 32px page inset on wide screens.
- Keep borders subtle and surfaces flat. Use elevation only for menus, dialogs, and overlays.
- Tables are first-class: align values, preserve column labels, support keyboard navigation, and expose row details without hiding evidence.
- On mobile, collapse navigation and stack summary regions; prioritize alert triage and event inspection over dashboard decoration.

## Interaction and accessibility

- Dark theme by default for the analyst console; retain a clear light theme path for users who need it.
- Meet WCAG AA contrast for text and controls; provide visible focus, reduced-motion support, keyboard operation, and accessible chart summaries.
- Use motion to confirm user actions or reveal detail. Avoid continuous chart animation and decorative entrance effects.
- Provide clear loading, empty, error, stale-data, quota-reached, and partial-outage states.
- Never present illustrative/sample metrics as live security facts. Label demo data clearly.

## Avoid

- Mountain/gradient hero backgrounds inside working pages.
- Orange used as the default chart series or severity color.
- Equal visual weight for all KPI cards and content panels.
- Glows, glass blur, and large rounded cards on every surface.
- Charts without time range, units, legend, empty state, and accessible text alternative.


## Dashboard refinement, 2026-10-25

The demo defaults to light when no preference exists and retains dark mode. Follow shadcn/Watermelon composition patterns with native React/CSS: one scoped event search, readable controls, native event actions and explicit empty states. No wholesale Tailwind or registry-template import is selected. Ordinary content is at least 14px, inputs 16px, secondary metadata 12px and actionable targets 44px. Use compact summary/counts derived from fixture data; do not imply live collection or add decorative trends. Neutral synthetic/connection labels have no green glow or pulsing pip. Reserve green for an explicit completed/resolved outcome. Separate orange filled-action contrast from orange text-link contrast.

## Console navigation (batch006)

Group implemented destinations by task: Workspace (Overview, Explore events), Investigations (Alerts, Cases, Investigation guide), Manage (Detections, Sources, Settings). Keep groups readable in sentence case. Native page links reflect URL state, support history and refresh, and show the current page; event evidence has a validated fixture-ID link. Use a scrollable navigation body between a stable brand/workspace header and documentation/GitHub footer. Collapse is an optional saved desktop preference, never the default on a phone. The mobile drawer retains full labels.

Search workspace is a native modal command/search surface for pages, bounded sample events and actions. Support Cmd/CtrlK and standard arrows/Enter/Escape. Cmd/CtrlB changes desktop collapse, but must not intercept text editing. Workspace choice routes to Demo or the separate private operator workspace; it does not authenticate users, transfer data, or select an authorized tenant. Do not reintroduce a fictional profile or label the implemented learning guide as Reports. Read `docs/audit/NAVIGATION-DESIGN-PLAN.md` for references and design rationale.
