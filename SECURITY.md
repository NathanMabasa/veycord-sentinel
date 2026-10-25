# Security status and reporting

Veycord Sentinel is in early development. No supported production release, security certification, government approval or guarantee of vulnerability absence is established. Use synthetic data while the documented identity, privacy and operational gates remain open.

Do not post exploit details, credentials, database contents, customer telemetry or personal information in public issues. Use [GitHub private vulnerability reporting](https://github.com/NathanMabasa/veycord-sentinel/security/advisories/new), enabled and verified on 2026-10-25. GitHub sign-in is required. A public issue is not a private channel; no email reporting address or response SLA is established.

Reports should include affected version/configuration, impact, authorized synthetic reproduction, expected vs actual behavior and mitigation if known. Keep testing within systems you own or have permission to assess. This project has not committed to a response SLA yet.

The engineering procedure is in docs/brain/03-Security/Vulnerability Response Manual.md. Release gates and known limitations are tracked in docs/tickets/NEXT-RELEASE-GATES.md. Security-related dependency updates require review and regression evidence; no update is automatically merged or deployed.
