---
name: wf-flow
description: vibe-workflow stage 3 (UX). Write the UX flowchart in mermaid from the feature spec and settle the screen list. Use when the user says "flowchart", "user flow", "screen flow", "draw the UX flow", "user journey".
---

# wf-flow — 3. UX flowchart [UX]

Before starting, Read `${CLAUDE_PLUGIN_ROOT}/reference/stage-rules.md` and follow the common procedure. Stage key: `flow`.

## Input

- Feature spec (`.workflow/02-spec.md`) — especially core features and Must features

## Steps

1. **Screen list** — derive the screens needed to perform the features. Give each a slug (lowercase letters, digits, `-`) and links to related features. The slug becomes the stage 4 file name.
2. **Overall flow** — mermaid `flowchart`. Entry points, major branches, goal-achievement points. At most 20 nodes; split by task beyond that.
3. **Per-core-task path** — for each core feature: start screen → path → one line of exception branches.
4. Check: Must features missing from the flow, unreachable screens, dead-end screens. Show any found to the user.
5. Settle judgment-call branches (e.g. login timing, onboarding or not) with `AskUserQuestion`.

## Done

After user confirmation: `status: done` → Decision log → `WFCTL sync` → `/wf-references`.
