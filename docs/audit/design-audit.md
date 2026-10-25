# Stylesheet audit — SEN-104

Date: 2026-10-23

## Changes

- Removed the unused CSS-generated hero signal illustration and the superseded landing-page layout rules. The current landing page uses the site-page/editorial classes.
- Removed the Google Fonts import. Interface and technical text now use system Inter and monospace fallback stacks, avoiding an external font request in the demo.
- Corrected the public hero headline so explicit line breaks no longer force narrow, one-to-two-word lines. The product preview stacks below the copy through tablet widths.
- Added a responsive/accessibility layer for visible focus in both console themes, 40px interactive targets, horizontal table scrolling, narrow layout overflow, and the mobile console off-canvas sidebar.
- Added light-theme surfaces and readable text for event details, raw evidence, empty states, and code blocks. Added a flexible textarea baseline for the case note editor.

## Verification evidence

Used the existing Vite development server and installed Python Playwright; no dependencies were installed. Chromium visited the public home page at 360×800, 768×900, and 1440×1000. At all three widths, `document.documentElement.scrollWidth` matched the viewport width (360, 768, and 1440px). At 768px, the hero changed to one column; at 1440px, the headline displayed as a compact three-line block. Screenshots were captured at `/tmp/veycord-audit-{360,768,1440}.png` and visually inspected at 360px and 1440px.

This was a stylesheet/browser layout audit only. It did not exercise console routes, theme switching, or keyboard flows; those require integration with the console UI.

## Hero refinement — 2026-10-24

Consolidated the active editorial hero dimensions and type rules into the public-site v3 selectors. Desktop now uses a 56–72px headline scale, a wider copy column, tighter section rhythm, and a balanced product preview. The responsive tablet breakpoint stacks copy and preview; mobile keeps the two CTA buttons full-width and uses a fluid 36–56px headline scale. The headline spans use the `.hero-headline-line` class for intentional two-line composition.

Playwright Chromium checked the final two-line headline in the app at 1440×900, 1280×800, 768×900, 390×844, and 360×800. Document scroll width equaled viewport width at every size; neither headline span overflowed. The primary CTA bounds were y=566–620 at 1440×900 and y=555–609 at 1280×800, fully visible in both desktop viewports. At 768px, the CTA ended at y=478 and the preview stacked below it. On 390px and 360px, the CTA ended at y=466 and y=505 respectively; the two headline lines fit without overflow. Desktop product preview ended at y=727 and y=729 respectively.

Viewport screenshots captured and visually checked: [1440×900](screenshots/hero-1440x900.png), [1280×800](screenshots/hero-1280x800.png), [768×900](screenshots/hero-768x900.png), [390×844](screenshots/hero-390x844.png), and [360×800](screenshots/hero-360x800.png).

Rechecked the 1440px light console screenshot after contrast updates: panel heading foreground was `rgb(23, 33, 49)`, table header foreground/background were `rgb(70, 85, 106)` / `rgb(238, 242, 246)`, and table cell text was `rgb(51, 65, 85)`. Screenshot: `/tmp/veycord-dashboard-light-final-1440.png`.
