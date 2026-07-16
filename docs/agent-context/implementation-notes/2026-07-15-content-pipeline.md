---
title: "Content Pipeline implementation note"
created: 2026-07-15 23:29
updated: 2026-07-15 23:29
status: final
purpose: "项目架构、设计、实现或运维参考文档。"
scope: "全项目"
related: []
tags:
  - agent-context
---
# Content Pipeline implementation note

## Scope

The first implementation slice converts the content pipeline from a filesystem-only candidate list into a database-backed workflow.

## Implemented in this slice

- Added `ContentCandidate`, `ContentRevision`, and `ContentPublication` Prisma models.
- Extended `Job` with retry and execution metadata.
- Added a migration under `nuxt-app/prisma/migrations/20260715150000_content_pipeline`.
- Added explicit candidate states: `draft`, `submitted`, `reviewing`, `changes_requested`, `approved`, `rejected`, `published`, and `archived`.
- Added candidate create, edit, submit, review, publish-as-draft, archive, and import APIs.
- Added an AI candidate endpoint. AI output is stored as a private draft and is never published directly.
- Added private AI conversation Markdown archives under `00_inbox/conversations`.
- Added an idempotent inbox/raw processor that writes processed and candidate Markdown artifacts without publishing.
- Added a Job-backed manual processing endpoint for administrators.
- Updated the admin page to separate approval from publication.

## Deliberate boundaries

- Publishing creates an `Article` or `Portfolio` record with `status=draft`.
- Public publication remains a separate manual operation.
- Candidate source and conversation reference are persisted for auditability.

## Remaining verification and limitations

- End-to-end transitions with real authentication have not been exercised against a running server.
- The repository includes an opt-in single-instance scheduler; multi-instance deployments should use one external scheduler or a distributed lock.
- Full YAML Markdown frontmatter parsing is not implemented; the current parser handles the supported scalar fields and simple tag arrays.

The admin page now supports editing draft and changes-requested candidates; edits create a new revision.

## Verification update

- Conda environment `fany-site` was created from the repository `environment.yml`.
- Prisma generate, schema validation, and migration deployment against a fresh SQLite verification database passed.
- Full TypeScript `tsc --noEmit` passed.
- Nuxt production build passed in Conda environment `fany-site` with Node 22; only non-fatal dependency/deprecation warnings were emitted.
- `git diff --check` passed.
