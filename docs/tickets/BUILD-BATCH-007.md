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
