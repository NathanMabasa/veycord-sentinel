# Console navigation design — batch006

## User job and visual direction

Help a new analyst find events, triage an alert, document a case and understand the tool. Keep the Veycord Inter type and restrained navy/orange identity. The memorable element is the compact Veycord rail; operational content keeps its readable hierarchy.

Palette: canvas #F5F7FA, surface #FFFFFF, ink #172131, muted #526074, line #DCE2E9, action #B54708. Retain the existing dark semantic tokens. Navigation text 14px, input 16px, descriptive metadata 12px, targets at least44px. Avoid decorative live indicators and invented user profiles.

```text
Expanded268px             Collapsed80px           Phone
Brand       Collapse     Mark                    Header / menu
Workspace switch         Expand                  Modal drawer
                         Workspace icon          (same labels)
Workspace                Overview icon
  Overview               Events icon
  Explore events         ...
Investigations           ...
  Alerts / Cases / Guide
Manage
  Detections / Sources / Settings
Documentation / GitHub   Resource icons
```

The header/body/footer stay distinct; only the body scrolls. Retain full labels by default. Collapse is optional and saved as a bounded browser preference. A modal drawer replaces the rail on phones. Counts describe actual unresolved alerts and open cases, without implying collection health.

## Working behaviour

- Native links and validated URL view/event state; refresh, direct links, Back/Forward and open-in-new-tab work.
- Workspace switch offers the synthetic demo and the separate private PostgreSQL route with honest descriptions.
- Search dialog finds pages, bundled event evidence and useful actions; Cmd/CtrlK, arrows, Enter and Escape work.
- Remove the Reports mislabel for the existing guide; use Investigation guide. Actual reporting remains future scope.
- Collapse labels have accessible names and hover/focus hints. Drawer and search dialog preserve focus, Escape and reduced motion.
- Extract navigation configuration, sidebar and command dialog into focused modules; keep feature state and data boundaries in the console.

## References reviewed 2026-10-25

- [shadcn sidebar](https://ui.shadcn.com/docs/components/radix/sidebar): header/content/footer structure, groups and collapse modes.
- [Atlassian navigation layout](https://atlassian.design/components/navigation-system/layout): scrollable body, stable footer, responsive collapse.
- [Refero dashboard guidance](https://styles.refero.design/examples/dashboard-ui-design): predictable alignment and restrained dense workspace hierarchy.

Adapt patterns using existing React, React Router, Lucide and native CSS/dialog. No third-party registry installer, copied template, new runtime dependency or imported visual asset. Rejected a decorative sidebar card, fictional profile and additional top-level destinations without implemented content. This makes the design specific to the existing investigation workflow.
