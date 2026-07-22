---
title: "Final acceptance report 2026-07-21"
created: 2026-07-21
updated: 2026-07-21
status: partial
---

# Final Acceptance Report

## Test metadata

- Tester: Codex
- Date: 2026-07-21 (America/Los_Angeles)
- Repository commit: `147329e`
- ECS image: `personal-website:147329e`
- ECS image digest: `sha256:9b23c031bcf437e9d7032fcaa2311eea32f0ad6ddcad189277f9a4ef0db9dded`
- Build artifact: `E:\FanY-site-build\147329e\artifacts\personal-website-147329e.tar.gz`

## Passed

- ECS repository is clean and aligned with `origin/master`.
- ECS production container is running and the public HTTP health check succeeds.
- Article keyword search endpoint returns HTTP 200 for a published-article query.
- Ubuntu `photo-original-api` service is active.
- Ubuntu `frpc` service is active.
- Ubuntu `photo-backflow.timer` and `photo-thumbnail-sync.timer` are active.
- ECS reaches Ubuntu through the FRP route; the internal photo health endpoint returns `{"ok":true}`.
- Build output is stored under the shared `FanY-site-build/<commit>/` workspace policy.

## Not executed in this acceptance run

The following scenarios require controlled test accounts and disposable photo fixtures and were not run against production data:

- friend upload → pending → family visibility flow;
- rejected upload visibility;
- public/private thumbnail separation;
- `/ai` authorization and command-denial tests;
- Hermes draft publication gate;
- Skill Registry state transitions;
- destructive-operation confirmation/audit tests;
- database restore to an isolated test copy.

## Risks and release decision

- No service or deployment blocker was found in the checks above.
- The report is **not a complete business acceptance** because the production end-to-end permission and data-recovery scenarios remain unexecuted.
- Do not treat this report as authorization for destructive production tests. Run the missing scenarios with disposable fixtures and a rollback plan before declaring full release acceptance.

