---
name: wf-wireframe-review
description: vibe-workflow stage 7 (UI, full mode). The user reviews and approves the wireframes. Collect feedback, fix the wireframes, and record each round. Use when the user says "wireframe review", "review the screens", "I checked the wireframes", "change this screen", "approve the wireframes".
---

# wf-wireframe-review — 7. Wireframe review [UI]

Before starting, Read `${CLAUDE_PLUGIN_ROOT}/reference/stage-rules.md` and follow the common procedure. Stage key: `wireframe-review`.

## Only the user decides

Never approve on the user's behalf. Even if no issues seem to exist, always ask via `AskUserQuestion`.

## Steps

1. Review guide: tell the user to open `06-wireframe/index.html` and click through the core task paths. Give only 4 things to look for: missing screens or elements, awkward order, unclear wording, anything unnecessary.
2. Take the user's feedback and record one line per screen in the round table.
3. Fix the wireframes. If the flow changes, reflect one line in `03-flow.md` too. A new or changed component → update `DESIGN.md`.
4. `AskUserQuestion`: "Approve / Fix and review again / Redo from the flow".
   - Fix → new round. Past 3 rounds, summarize the issues and propose revisiting the flow
   - Redo from the flow → set `03-flow.md` status to `draft`, then `/wf-flow`

## Done

On approval: `status: approved`, write the user in `reviewer` → Decision log → `WFCTL sync` → `/wf-ui-sample`. If changes are requested, the decision is `changes-requested`.
