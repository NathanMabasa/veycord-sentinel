# Product Thesis

## One sentence

Veycord Sentinel helps small teams and learners collect security events, find suspicious behavior, and explain what happened through an approachable hosted or self-hosted investigation workflow.

## Vision

Make capable security monitoring understandable and usable without an expensive license, a cloud account, or prior Splunk expertise. The product should be useful for a small organization, a home lab, a training cohort, and a technically capable public-sector team evaluating an on-premises tool.

## What it is

- An open-source security analytics application with a coherent path from ingest to investigation.
- A learning-friendly user experience that explains concepts and provides safe sample data.
- A portfolio-quality security engineering project whose controls, threat model, and limitations are visible.
- A platform that can be run locally, on a small server, or in a disconnected environment as it matures.

## What it is not (initially)

- A claim of equivalence to mature Splunk Enterprise Security, Elastic Security, or OpenSearch at scale.
- An endpoint protection suite, firewall, or automated containment system.
- A compliance certification or guarantee of POPIA or government compliance.
- A product that requires the community to send telemetry to Veycord.

## Product principles

1. **Free to run:** core functionality has no usage cap, trial expiry, paid-only security feature, or mandatory hosted dependency.
2. **Useful quickly:** a new user can load a sample dataset and complete an investigation before connecting a real source.
3. **Open formats:** favor standards and documented APIs for events, detections, and exports.
4. **Safe by default:** bind locally for development, authenticate non-local deployments, minimize privileges, and never execute response actions silently.
5. **Explainable detections:** show why an alert fired, the fields involved, rule provenance, and expected false positives.
6. **Privacy-aware:** local-first data handling, explicit retention, sensitive-field controls, and no surprise telemetry.
7. **Evidence over claims:** document threat model, security controls, test evidence, supported deployment modes, and known gaps.
8. **Inclusive and teachable:** plain language, keyboard access, usable defaults, and guided paths for beginners.

## Success signals

- A learner can go from clone/download to a first sample investigation in under 15 minutes on a modest laptop.
- A user can ingest supported host and network logs, search them, run a detection, and export evidence.
- Core use works offline after installation and does not require a Veycord account.
- New contributors can run the development stack and validate a detection with documented steps.
- A security reviewer can trace each high-risk control to an owner and verification artifact.

## Positioning

Describe Veycord Sentinel as an **open-source security monitoring and investigation workbench**. Use “Splunk alternative” only as a comparison for a target audience, not a claim of feature parity. Differentiation: approachable onboarding, transparent cost, learning content, open detection content, and security posture visible in the product.

## Related notes

[[Personas and Jobs]] · [[Scope and Non-Goals]] · [[Phased Roadmap]] · [[Decision Register]]
