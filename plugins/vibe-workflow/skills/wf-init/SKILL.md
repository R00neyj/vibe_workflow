---
name: wf-init
description: Install vibe-workflow into a project, create the hub document (.workflow/README.md), then move on to stage 1 (Planning). Use when the user says "start the workflow", "start a new project", "set up vibe coding", "install vibe-workflow".
---

# wf-init — Install

`WFCTL` = `node "${CLAUDE_PLUGIN_ROOT}/scripts/wfctl.js"`

## Procedure

1. **Mode** — `AskUserQuestion`: "Full — all 14 stages (product to share or ship) / Lite — 9 stages, skips UI references, wireframe review, tech design, pre-release and internal test (small or personal project)". Recommend lite for a weekend-sized project. Then run `WFCTL init --mode <full|lite>` at the project root. If already installed, stop and `AskUserQuestion` whether to use `--force` (re-detect config, keep documents). The mode can be switched later with `WFCTL mode <lite|full>`.
2. Report the detected results (checks, run commands) to the user. If empty, do not fill them now; they are decided in stage 8 (tech design) or 9 (prototype).
3. For a project with existing code, read the README, manifest, and directory structure, then write only confirmed facts into the hub `Overview` section, at most 3 lines.
4. Show the flow once:

```
Planning     1 Research & brief → 2 Feature spec
UX           3 UX flowchart
UI           4 UI references* → 5 Design system (DESIGN.md) → 6 Mid-fi wireframe → 7 Wireframe review*
Development  8 Tech design* → 9 Prototype → 10 Usability test → 11 Hardening & verification
Release      12 Pre-release* → 13 Internal test* → 14 Release
* skipped in lite mode
```

5. Give the hub path (`.workflow/README.md`) and continue to `/wf-brief`. Tell the user they need not memorize stage names; saying "next step" is enough.
