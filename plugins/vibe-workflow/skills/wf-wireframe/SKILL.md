---
name: wf-wireframe
description: vibe-workflow stage 4 (UI). Build low-fi wireframes as static HTML from the flowchart's screen list. Screens link to each other so the flow can be clicked through. Use when the user says "wireframe", "design the screens", "lay out the screens", "low-fi", "first draft of the screens".
---

# wf-wireframe — 4. Low-fi wireframe [UI]

Before starting, Read `${CLAUDE_PLUGIN_ROOT}/reference/stage-rules.md` and follow the common procedure. Stage key: `wireframe`.

## Input

- UX flow (`.workflow/03-flow.md`) — screen list, flow
- Feature spec (`.workflow/02-spec.md`) — inputs and results each screen must hold

## Steps

1. `WFCTL new wireframe` creates `04-wireframe/index.html` and `wireframe.css`.
2. For each slug in the screen list: `WFCTL screen <slug> "<screen name>"`.
3. Rules for each screen:
   - **Low-fi only.** Gray boxes, dashed lines, and role labels instead of real copy. No color, fonts, images, or icons. Use only `wireframe.css` classes (`box`, `row`, `btn`, `input`)
   - Wire the flow's transitions with `<a href="next.html">` — the user must be able to follow the flow by clicking
   - Link related features via `../02-spec.md#f-xx`
   - Comments at most 3 lines: what the user does on this screen
4. Link every screen from the `index.html` list.
5. Tell the user how to open it in a browser (file path). If possible, open it yourself and check for broken links.

## Done

When every screen in the flow exists and the links connect: `status: done` → `WFCTL sync` → `/wf-wireframe-review`.
This stage can complete without user approval. Approval comes in stage 5.
