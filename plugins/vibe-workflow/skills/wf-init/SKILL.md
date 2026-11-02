---
name: wf-init
description: Install vibe-workflow into a project, create the hub document (.workflow/README.md), then move on to stage 1 (Planning). Use when the user says "start the workflow", "start a new project", "set up vibe coding", "install vibe-workflow".
---

# wf-init — Install

`WFCTL` = `node "${CLAUDE_PLUGIN_ROOT}/scripts/wfctl.js"`

## Procedure

1. Run `WFCTL init` at the project root. If already installed, stop and `AskUserQuestion` whether to use `--force` (re-detect config, keep documents).
2. Report the detected results (checks, run commands) to the user. If empty, do not fill them now; they are decided in stage 6.
3. For a project with existing code, read the README, manifest, and directory structure, then write only confirmed facts into the hub `Overview` section, at most 3 lines.
4. Show the flow once:

```
Planning     1 Research & brief → 2 Feature spec
UX           3 UX flowchart
UI           4 Low-fi wireframe → 5 Wireframe review
Development  6 Prototype → 7 Usability test
Release      8 Pre-release → 9 Internal test → 10 Release
```

5. Give the hub path (`.workflow/README.md`) and continue to `/wf-brief`. Tell the user they need not memorize stage names; saying "next step" is enough.
