# Build batch007 — public web distribution

Owner request: provide a web version and let visitors see/download the GitHub version.

| Ticket | Scope | Evidence / status |
|---|---|---|
| SEN-701 | Publish website, synthetic demo and read-only fixture API as one public Worker | Version1 deployed successfully 2026-10-28; public access verified; seven unauthenticated HTTP checks and live browser routes/API explorer pass |
| SEN-702 | Keep public browser mode separate from private operator credentials | `/workspace` renders self-hosting instructions; private API absent; GitHub header/footer/hero links retained |
| SEN-703 | Reproducible build, artifact/source safety and regression checks | Standard build, 38 unit checks, five built Worker checks and 36 public browser checks pass locally; 320/768/1440px; configured-secret/artifact review passed; no new runtime dependencies |
| SEN-704 | Record deployment/version, link GitHub back to web demo and protected integration | Web publication and GitHub homepage/README link complete; PR12 required CI remains pending after a Linux-only 320px homepage check failed; preserve branch protection |

Read [public deployment guide](../PUBLIC-WEB.md). No real telemetry, paid infrastructure purchase, new authentication or multi-user readiness is included.

## Publication evidence

- Public origin: https://veycord-sentinel.nyikonathanmabasa.chatgpt.site
- Site: `appgprj_6ae1df006640819185d4ffa2e912d1b5`; saved version1: `appgprj_6ae1df006640819185d4ffa2e912d1b5~appgver_869958726eb08191a918842c26dd19fb`.
- Successful deployment: `appgdep_6ae1e046bed48191b9e2810c6328f9c4`; Site source commit `ee73bad1ffc861a99eb86fd2a0edfc1dd33f6b38`, exported from GitHub candidate `2501be9` with the documented build-script mapping. Archive SHA256 `ce908c899dcac0cc9de13bf752efb561ec26454cfdbbc427fa1e58c78fb8f262`; two files, no database/configuration secrets.
- `public-site-http.json` and `public-site-live-browser.json` record actual cloud requests. A default Python user agent initially received platform403; a browser user agent and actual Chromium both reached the public site without credentials or redirects. CSP was preserved.
- Initial GitHub verify40682283829 passed existing checks and five new Worker contracts, then failed the new homepage320px browser check on Linux. Local36 browser checks passed. Additional dimensions/offender diagnostics were added rather than weakening the check; final integration must await resolution and a passing final head.


## Resumed mobile correction (2026-10-28)

GitHub run40682749080 recorded the exact failure: viewport320px, scrollWidth343px, the homepage scope link right edge342.875px. Its shared text-button style forced nowrap; Linux font metrics exposed the overflow. The correction is scoped to `.principles-section > .text-button`: allow normal wrapping, constrain maximum width to its content area, retain left alignment and prevent the arrow icon from shrinking. No font size was reduced and no overflow was hidden. The existing viewport assertion remains unchanged; a new enlarged-text20px/320px regression checks the link bounds and icon width.

The rebuilt Worker has five passing contract checks. Local browser verification passes37 checks; Linux final-head verification and corrected public publication are still required. Screenshot: `screenshots/public-home-link-320.png`.


The first resumed Linux run40686293935 passed the homepage check, then exposed the new public self-hosting action overflowing at320px (scrollWidth345). The action's box fit, but its inherited nowrap text extended beyond it. The public guide now has a scoped wrapping/max-width rule too; a separate20px text-range regression detects overflow even when element boxes fit. Both changes preserve readable text and the CSP. Version2 was saved but not deployed after this additional failure; only a fully verified corrected version may replace live version1.


Resumed final candidate: standard build and38 unit checks pass; five Worker contracts pass;38 public browser checks pass locally, including both enlarged-text regressions. The original Linux viewport checks remain strict. Live repository protection was re-read; only squash merging is now offered, with existing verification/CodeQL/admin/secret protections retained. See `github-public-protections-batch007.json` and batch008 for the explicit zero-external-review limitation and Sentry prerequisites.


Correction to the initial self-hosting diagnosis: run40687036139's richer diagnostics identified the inner-hero H1, specifically the unbreakable word infrastructure, as the remaining345px overflow. The action wrapping change is retained because its enlarged-text regression is useful, but it was not sufficient to fix that heading. The public title now uses concrete shorter wording (Run your own Sentinel workspace) and inner-hero headings can wrap long tokens without clipping or reducing font size. Saved versions2 and3 were not deployed; live version1 awaits a fully passing replacement.


PR12 merged normally after required checks passed on c6dc22c: Verify40688432445 and CodeQL40688432436. Main merge a0577c1d18e95a776d044a357d639b796d4819fc. The mobile heading correction passed on Linux. The one-time resume automation was deleted. The next public publication includes the owner's clarified onboarding work in batch009; do not deploy the rejected saved versions2/3.
