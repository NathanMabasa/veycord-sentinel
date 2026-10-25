# Demo dashboard clarity and accessibility review

Scope: read-only review of `src/features/demo/Console.tsx`, the demo rules in `src/styles.css`, and the saved overview screenshots in `docs/audit/screenshots/dashboard-dark.png` and `dashboard-light.png`. No code or dependencies were changed. Screenshot values can reflect browser-local demo state.

## Five highest-impact findings

1. **Routine text is too small for scanning.** The overview screenshot is desktop sized, but ordinary labels and evidence are still rendered at 8–10px in the current stylesheet: panel subtitles 8px, table cells 9px, metric labels 9px, and navigation 11px. This makes the supporting context harder to read than the large metrics. Raise standard controls, summaries, and table text toward 12–14px; retain smaller type only for secondary metadata. The product design guide already calls for 12–14px table cells and readable console copy.

2. **The overview gives decorative metrics and an ungrounded chart too much emphasis.** The four metric tiles (`Sample events`, `Open alerts`, `Starter detections`, `Sample sources`) share equal weight, while only some lead to an action. `Chart()` plots the fixed `activity` array against hour labels and an unlabeled count axis; the adjacent copy says it is neither time-filtered nor live. Prefer a compact, clearly synthetic summary that leads with the alert queue and recent events. Keep the chart only if its fixture period, unit, and relationship to the displayed records are explicit; otherwise remove it. This follows the product direction to avoid decorative metrics and charts without range, units, legend, and accessible summary.

3. **Event rows look interactive but are not controls.** `EventTable` puts `tabIndex={0}`, `onClick`, and an Enter-only handler on `<tr>`. A table row is not announced as a button or link, Space does nothing, and no visible row action indicates inspection. Use a real “View event” link/button in a cell (or another semantic control) and keep the row itself a normal table row. Add a table caption and scoped column headers while there.

4. **There are two search inputs for one search state.** The top-bar search switches to Explore as the user types, while Explore renders a second auto-focused search input bound to the same value. This produces duplicated search controls on the results screen and makes it unclear which field owns filters. Keep one search box and make its scope explicit, or make the top-bar control a clear navigation action that opens the Explore search. Put source/severity filters and result count beside that one field.

5. **The Alerts count has no state label.** The sidebar badge is an unlabeled `<i>` containing only a number, and it counts alerts in `New` status. The overview separately reports all unresolved alerts. The screenshots show differing badge values against the same unresolved total, which is valid for changed local state but looks inconsistent without the meaning. Render a readable/accessible label such as “2 new” and make the distinction between new and unresolved explicit where both counts appear.

## Pattern and implementation guidance

- Use the [shadcn/ui Data Table guide](https://ui.shadcn.com/docs/components/data-table) as a composition pattern: table behavior varies by product, and the guide builds project-specific sorting/filtering on top of primitives. For this bundled eight-row demo, native tables and CSS are sufficient; there is no reason to install TanStack Table yet.
- The [shadcn/ui Dialog pattern](https://ui.shadcn.com/docs/components/dialog) describes modal content as making the underlying page inert. The demo’s mobile nav already applies that model; preserve keyboard containment, Escape, and focus return while simplifying its visual treatment.
- [Watermelon’s dashboard gallery](https://ui.watermelon.sh/dashboards) and [dashboard guide](https://ui.watermelon.sh/guides/build-react-dashboard-fast) are useful for seeing responsive shell/table/detail compositions. Its implementation guidance separates data fetching from presentational components, which aligns with this fixture-driven demo. Watermelon’s own framework docs identify Vite support with Tailwind CSS v4, and its install path uses the shadcn CLI; that is a poor fit for this repository’s native-CSS setup. Use its examples as references only; do not run its registry installer or copy whole templates.
- No additional UI package is recommended for this pass. The current React + native CSS + `lucide-react` stack can implement the needed hierarchy and semantics without a Tailwind migration or new dependency. Reconsider a headless table library only when real result volume, sorting, or column management requires it.

## Sources

- [shadcn/ui component catalog](https://ui.shadcn.com/docs/components)
- [shadcn/ui Data Table](https://ui.shadcn.com/docs/components/data-table)
- [shadcn/ui Dialog](https://ui.shadcn.com/docs/components/dialog)
- [Watermelon UI dashboard templates](https://ui.watermelon.sh/dashboards)
- [Watermelon UI dashboard guide](https://ui.watermelon.sh/guides/build-react-dashboard-fast)
- [Watermelon UI framework support](https://ui.watermelon.sh/framework-support)

## Primary engineer tool selection

Development-only `axe-core@4.14.0` is selected to check automated WCAG A/AA rules across dashboard states. npm metadata and official Deque source were reviewed on 2026-10-25: MPL-2.0, no added runtime dependency, last published metadata updated 2026-10-21. The lockfile pins it; advisory scan found no known advisories at adoption. The browser audit uses the existing local Playwright runner, does not disable production CSP and does not ship axe in the app bundle. Its incomplete results still need manual review; zero automated violations would not establish WCAG conformance. Replacing the tool is isolated to a development script and dependency. See [upstream axe-core](https://github.com/dequelabs/axe-core), THIRD_PARTY_NOTICES.md and `scripts/dashboard_accessibility.py`.
