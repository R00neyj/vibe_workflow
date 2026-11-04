---
name: wf-progress
description: Show the current vibe-workflow progress. Prints which stage the project is at, previous/current/next stage, and per-phase (Planning/UX/UI/Development/Release) progress, and points to the progress panel on the right of the screen. Does not run the next stage. Use when the user says "progress", "how far have we gotten", "which stage are we on", "current stage", "completion rate", "show status".
---

# wf-progress — Progress status

`WFCTL` = `node "${CLAUDE_PLUGIN_ROOT}/scripts/wfctl.js"`

Display only. Do not edit documents or run the next stage.

## Procedure

1. `WFCTL sync`, then `WFCTL status`. If `.workflow` is missing, point to `/wf-init` and end.
2. Report briefly in this format:

```
Progress 6/15 (full) · now [UI] 7. Wireframe review → /wf-wireframe-review
Planning ██████ 2/2 · UX ██████ 1/1 · UI ████░░ 3/5 · Development ░░░░░░ 0/4 · Release ░░░░░░ 0/3
Previous 6. Mid-fi wireframe (done) · Next 8. Styled key screens
Hub .workflow/README.md
```

3. If the current stage document has a filled `At a glance` summary, append its first line.
4. If the hub has `Open questions`, report only the count.
5. Display note: the progress panel opens automatically on the right at session start in a wide window (about 110+ columns). In a narrow window it shows as one line in the status line below the prompt. `/progress` opens it any time.
6. The user decides whether to continue. If they say "next step", go to `/wf-next`.
