---
name: wf-tech
description: vibe-workflow stage 9 (Development, full mode). Decide the technical design before building — stack, data model, API and integrations, auth, environments, risks. Use when the user says "tech design", "architecture", "which stack", "data model", "database schema", "API design", "how should we build this".
---

# wf-tech — 9. Tech design [Development]

Before starting, Read `${CLAUDE_PLUGIN_ROOT}/reference/stage-rules.md` and follow the common procedure. Stage key: `tech`.
Skipped in lite mode: then `/wf-prototype` records the stack itself.

## Input

- Feature spec (`.workflow/02-spec.md`) — features, inputs/outputs, exceptions, non-functional requirements
- Brief (`.workflow/01-brief.md`) — constraints (platform, deploy target, schedule, data)
- `DESIGN.md` and `.workflow/08-ui-sample/tokens.css` (full mode) — only to pick a UI stack that can express its tokens; the CSS variable names carry over
- Existing code, if any — keep the existing stack unless the user wants a change

## Steps

1. **Stack** — for each layer still open, 2–3 options via `AskUserQuestion` (recommended first, with one-line trade-offs). Prefer the simplest stack that meets the brief; a static front end is fine if there is no shared data.
2. **Data model** — entities, fields, relations, and which F-IDs use them. Only what Must features need.
3. **API / integrations** — each endpoint or external service: purpose, auth, what happens when it fails.
4. **Auth & environments** — who can do what; local / pre-release / production targets; where secrets live (never in the repo).
5. **Risks** — the 1–3 things most likely to go wrong (an unknown API, a hard feature) and how to de-risk them early in the prototype.
6. Fill `run`, `checks` and `deploy` in `.workflow/config.json` where they are now known.

Keep it to about 60 lines. Decisions, not essays.

## Done

Confirm via `AskUserQuestion` → `status: done` → Decision log (stack) → `WFCTL sync` → `/wf-prototype`.
