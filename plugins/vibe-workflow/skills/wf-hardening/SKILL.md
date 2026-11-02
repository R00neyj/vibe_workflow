---
name: wf-hardening
description: vibe-workflow stage 11 (Development). Turn the tested prototype into release-quality code — verify every acceptance criterion with evidence, then harden error handling, edge cases, loading states, security, accessibility, performance and design consistency. Use when the user says "harden", "verify features", "check acceptance criteria", "QA", "is it ready for release", "edge cases", "clean up before release".
---

# wf-hardening — 11. Hardening & verification [Development]

Before starting, Read `${CLAUDE_PLUGIN_ROOT}/reference/stage-rules.md` and follow the common procedure. Stage key: `hardening`.
Usability proved people can use it; this stage proves it works and holds up.

## Input

- Feature spec (`.workflow/02-spec.md`) — acceptance criteria and exceptions per feature
- Tech design (`.workflow/08-tech.md`, full mode) — integrations and their failure handling
- `DESIGN.md` — tokens and components, for the design consistency check
- The code (`git diff` since the prototype started, or the whole app)

## Steps

1. **Acceptance criteria** — copy every Must criterion into the table. Verify each by actually running something (a test, a command, or the app) and write how. **Never write `pass` for something you did not run.** If it cannot be automated, give the user exact steps and get the result via `AskUserQuestion`.
2. **Hardening checklist** — go through each area in the template. Fix what fails; log what remains as H-xx with severity.
3. **Design consistency and anti-slop** — run the Detection searches in `${CLAUDE_PLUGIN_ROOT}/reference/ui-anti-slop.md` (adapted to the stack). Replace raw values with tokens; fix every slop hit or list it under DESIGN.md `Deliberate exceptions` with a reason.
4. **Checks** — `WFCTL check`. If there are no automated checks yet, add at least one (build or a smoke test) and register it in `config.json`.
5. Fix from high severity down. Large changes follow the common rules' `Doc involvement level`.

## Done

All Must criteria `pass`, no open `high` issue, `WFCTL check` passes → confirm via `AskUserQuestion` → `status: done` → doc catch-up from `/wf-next` → `WFCTL sync` → next stage (`/wf-prerelease`, or `/wf-release` in lite mode).
