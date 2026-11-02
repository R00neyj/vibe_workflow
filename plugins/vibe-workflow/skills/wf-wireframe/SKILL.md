---
name: wf-wireframe
description: vibe-workflow stage 6 (UI). Build mid-fidelity wireframes as static HTML from the flowchart's screen list — grayscale, real copy, real proportions, DESIGN.md type scale, spacing and components, key states. Screens link to each other so the flow can be clicked through. Use when the user says "wireframe", "mid-fi", "design the screens", "lay out the screens", "screen mockups", "first draft of the screens".
---

# wf-wireframe — 6. Mid-fi wireframe [UI]

Before starting, Read `${CLAUDE_PLUGIN_ROOT}/reference/stage-rules.md` and follow the common procedure. Stage key: `wireframe`.

## Input

- UX flow (`.workflow/03-flow.md`) — screen list, flow
- Feature spec (`.workflow/02-spec.md`) — inputs and results each screen must hold
- `DESIGN.md` (project root) — component names and layout patterns
- UI references (`.workflow/04-references.md`) — patterns to adopt per screen

## Steps

1. `WFCTL new wireframe` creates `06-wireframe/index.html` and `wireframe.css`.
2. For each slug in the screen list: `WFCTL screen <slug> "<screen name>"`.
3. **Set the kit from DESIGN.md** — copy its type scale, spacing, radius and font into the `:root` variables of `06-wireframe/wireframe.css`; set `--frame` to the platform width (390 mobile; add class `desktop` for 1280). Keep the grays.
4. **Mid-fi, not low-fi.** Each screen must read like the real product in grayscale:
   - **Real copy** — actual headings, labels, button text, helper and error messages, realistic sample data (names, dates, amounts, long and short). No "Lorem", no "Header", no "Content area"
   - **Real proportions** — actual hierarchy and sizes from the type scale, actual spacing, real element counts (a list shows 5–8 rows, not one box)
   - **Real components** — the kit classes (`btn primary`, `field`, `input`, `card`, `list`, `bar`, `tabbar`, `badge`, `avatar`) standing for DESIGN.md components; name non-obvious ones in a `data-component` attribute. A needed component that is missing → add it to DESIGN.md first
   - **Key states** — for core screens, show default plus the states that matter (empty, error, loading via `skeleton`) side by side in `wf-states`
   - **Not yet** — no brand color, photos (use `img` placeholders with a label of what goes there), final icons (`icon` placeholder), or motion. Follow the anti-slop checklist for copy and layout
5. Per screen also:
   - Wire the flow's transitions with `<a href="next.html">` — the user must be able to follow the flow by clicking
   - Link related features via `../02-spec.md#f-xx`
   - Comments at most 3 lines: what the user does on this screen
6. Link every screen from the `index.html` list.
7. Tell the user how to open it in a browser (file path). If possible, open it yourself and check for broken links.

## Done

When every screen in the flow exists, the links connect, and no placeholder copy is left (search the screens for "Lorem", "Header", "Content area", "Screen title", "Realistic item"): `status: done` → `WFCTL sync` → `/wf-wireframe-review`.
This stage can complete without user approval; approval comes in stage 7. In lite mode (no stage 7), finish with one `AskUserQuestion`: "Looks right / Change these screens", fix, then `status: done` → `/wf-prototype`.
