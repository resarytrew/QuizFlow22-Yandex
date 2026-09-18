# Editor reliability and workflow

The editor now offers graph, question-list and validation views. List order only changes the author's outline; participant paths are edited through explicit transitions. Inserting a question splices an existing connection. Clipboard operations preserve internal edges and their effects, remap group references, and use one undo checkpoint.

Cloud saves are serialized and carry the loaded revision. A stale revision receives HTTP 409 rather than overwriting another tab's work. The status control distinguishes server saves, local-only copies, pending changes, errors and conflicts. Local backups are scoped by account and quiz, retain five checkpoints and offer file export. They depend on browser storage availability and are not a replacement for cloud storage.

Migration 007 adds a reviewed snapshot separate from the working document. Public gallery, player and SEO use that snapshot. Editing content requires another administrator approval; previous approved content remains available until replaced or explicitly hidden/blocked. Canvas coordinates, selection and author notes do not invalidate approval. Author notes are excluded from participant responses. New documents remain private and unreviewed.

The preview reports the current node, score, variables and visited path and supports returning directly to the current block. Automatic screen quizzes report their path without a numeric score. Mobile editing switches between canvas, block library, properties and AI panels.

## Verification

- Unit tests: metadata preservation, serialized saves, conflicts, backups, graph validation and connected clipboard fragments.
- PostgreSQL integration: revision conflicts, metadata merges, reviewed snapshots, layout-only changes, private notes and moderation.
- Authenticated browser tests on desktop/mobile: transition insertion, reload persistence, validation, preview telemetry, failed network saves and explicit retry.
- Release workflow applies additive migration 007 before deploying verified backend/frontend artifacts. Rollback must preserve the new columns and reviewed data.
