---
name: wf-prototype
description: vibe-workflow stage 6 (Development). Build a working prototype from the approved wireframes and feature spec. Record tech stack, how to run, and implementation scope in 06-prototype.md. Use when the user says "let's build the prototype", "start development", "implement it", "start coding", "build it now".
---

# wf-prototype — 6. Prototype [Development]

Before starting, Read `${CLAUDE_PLUGIN_ROOT}/reference/stage-rules.md` and follow the common procedure. Stage key: `prototype`.
**Follow the Doc involvement level section closely** — from this stage on, implementation speed comes first.

## Input

- Feature spec (`.workflow/02-spec.md`) — Must features, acceptance criteria
- Wireframes (`.workflow/04-wireframe/index.html`) — screen layout and transitions
- Wireframe review (`.workflow/05-wireframe-review.md`) — leftover notes

## Steps

1. **Tech choice** — if the brief's constraints do not settle it, present 2-3 options via `AskUserQuestion` (recommended first). For an existing project, keep the existing stack.
2. **Build order** — start with the core features' task paths. Finish one path end to end before the next.
3. **Implement** — follow the wireframes' layout and transitions. Keep visual design minimal at this stage (readable is enough).
4. **Run check** — after each path, actually launch the app and verify. Fill the run command in `run` and the check commands in `checks` of `.workflow/config.json`. Run `WFCTL check`.
5. **Record** — in `06-prototype.md`: tech choice, how to run, implementation scope table, deviations from the wireframes. Keep it short.

## User requests mid-stage

If the user asks for a feature or change not in the spec, handle it per the common rules' `Doc involvement level` table. Medium or smaller: do not ask; implement, then reflect one line.

## Done

When Must features work and `WFCTL check` passes, tell the user how to try the demo and confirm via `AskUserQuestion` → `status: done` → `WFCTL sync` → `/wf-usability`.
If a check fails, fix and rerun. Never complete with a failing check.
