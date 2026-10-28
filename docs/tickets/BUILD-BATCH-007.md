# Build batch007 — public web distribution

Owner request: provide a web version and let visitors see/download the GitHub version.

| Ticket | Scope | Evidence / status |
|---|---|---|
| SEN-701 | Publish website, synthetic demo and read-only fixture API as one public Worker | Dedicated `build:public`; no database/connector binding; Sites publication pending |
| SEN-702 | Keep public browser mode separate from private operator credentials | `/workspace` renders self-hosting instructions; private API absent; GitHub header/footer/hero links retained |
| SEN-703 | Reproducible build, artifact/source safety and regression checks | Standard build, 38 unit checks, five built Worker checks and 36 public browser checks pass locally; 320/768/1440px; configured-secret/artifact review passed; no new runtime dependencies |
| SEN-704 | Record deployment/version, link GitHub back to web demo and protected integration | Pending successful native deployment and final-head required CI |

Read [public deployment guide](../PUBLIC-WEB.md). No real telemetry, paid infrastructure purchase, new authentication or multi-user readiness is included.
