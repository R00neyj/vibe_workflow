---
name: wf-prototype
description: vibe-workflow stage 8 (Development). Build a working prototype from the approved wireframes and feature spec. Record tech stack, how to run, and implementation scope in 08-prototype.md. Use when the user says "let's build the prototype", "start development", "implement it", "start coding", "build it now".
---

# wf-prototype — 8. Prototype [Development]

Before starting, Read `${CLAUDE_PLUGIN_ROOT}/reference/stage-rules.md` and follow the common procedure. Stage key: `prototype`.
**Follow the Doc involvement level section closely** — from this stage on, implementation speed comes first.

## Input

- Feature spec (`.workflow/02-spec.md`) — Must features, acceptance criteria
- `DESIGN.md` (project root) — tokens and components. **Read before writing any UI code**
- Wireframes (`.workflow/06-wireframe/index.html`) — screen layout and transitions
- Wireframe review (`.workflow/07-wireframe-review.md`) — leftover notes

## Steps

1. **Tech choice** — if the brief's constraints do not settle it, present 2-3 options via `AskUserQuestion` (recommended first). For an existing project, keep the existing stack.
2. **Tokens and components first** — turn DESIGN.md tokens into code (CSS variables / theme file, names mirrored: `color.primary` → `--color-primary`), then build its components with every listed state. Screens use only these; no raw values.
3. **Build order** — start with the core features' task paths. Finish one path end to end before the next.
4. **Implement** — follow the wireframes' layout and transitions and the DESIGN.md components.
5. **Run check** — after each path, actually launch the app and verify. Fill the run command in `run` and the check commands in `checks` of `.workflow/config.json`. Run `WFCTL check`.
6. **Record** — in `08-prototype.md`: tech choice, how to run, implementation scope table, deviations from the wireframes. Keep it short.

## User requests mid-stage

If the user asks for a feature or change not in the spec, handle it per the common rules' `Doc involvement level` table. Medium or smaller: do not ask; implement, then reflect one line.

## Done

When Must features work and `WFCTL check` passes, tell the user how to try the demo and confirm via `AskUserQuestion` → `status: done` → `WFCTL sync` → `/wf-usability`.
If a check fails, fix and rerun. Never complete with a failing check.
