---
name: wf-prototype
description: vibe-workflow stage 9 (Development). Build a working prototype from the approved wireframes and feature spec. Record tech stack, how to run, and implementation scope in 09-prototype.md. Use when the user says "let's build the prototype", "start development", "implement it", "start coding", "build it now".
---

# wf-prototype — 9. Prototype [Development]

Before starting, Read `${CLAUDE_PLUGIN_ROOT}/reference/stage-rules.md` and follow the common procedure. Stage key: `prototype`.
**Follow the Doc involvement level section closely** — from this stage on, implementation speed comes first.

## Input

- Feature spec (`.workflow/02-spec.md`) — Must features, acceptance criteria
- Tech design (`.workflow/08-tech.md`) — stack, data model, integrations (full mode)
- `DESIGN.md` (project root) — tokens and components. **Read before writing any UI code**
- Wireframes (`.workflow/06-wireframe/index.html`) — screen layout and transitions
- Wireframe review (`.workflow/07-wireframe-review.md`) — leftover notes

## Steps

1. **Tech choice** — follow the tech design. In lite mode (no tech design), present 2-3 options via `AskUserQuestion` (recommended first) and record the choice here. For an existing project, keep the existing stack. Build the riskiest integration from the tech design's Risks first.
2. **Tokens and components first** — turn DESIGN.md tokens into code (CSS variables / theme file, names mirrored: `color.primary` → `--color-primary`), then build its components with every listed state. Screens use only these; no raw values.
3. **Build order** — start with the core features' task paths. Finish one path end to end before the next.
4. **Implement** — follow the wireframes' layout and transitions and the DESIGN.md components.
5. **Run check** — after each path, actually launch the app and verify. Fill the run command in `run` and the check commands in `checks` of `.workflow/config.json`. Run `WFCTL check`.
6. **Design check** — capture each core screen (browser tool if available, otherwise ask the user for screenshots) and compare against DESIGN.md, the wireframe and `${CLAUDE_PLUGIN_ROOT}/reference/ui-anti-slop.md`. Slop not listed as a deliberate exception counts as a mismatch. Fill the `Design check` table; fix what is off, or update DESIGN.md if the change is intended.
7. **Record** — in `09-prototype.md`: how to run, implementation scope table, deviations from the wireframes. Keep it short.

## User requests mid-stage

If the user asks for a feature or change not in the spec, handle it per the common rules' `Doc involvement level` table. Medium or smaller: do not ask; implement, then reflect one line.

## Done

When Must features work, `WFCTL check` passes and the Design check has no open mismatch, tell the user how to try the demo and confirm via `AskUserQuestion` → `status: done` → `WFCTL sync` → `/wf-usability`.
If a check fails, fix and rerun. Never complete with a failing check.
