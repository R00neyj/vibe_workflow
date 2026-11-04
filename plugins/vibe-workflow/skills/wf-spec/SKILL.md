---
name: wf-spec
description: vibe-workflow stage 2 (Planning). Write the feature spec from the brief. Settle feature IDs, priorities, core features, and acceptance criteria and write them to 02-spec.md. Use when the user says "feature spec", "list the features", "pull out a feature list", "write the spec", "spec for a new feature".
---

# wf-spec — 2. Feature spec [Planning]

Before starting, Read `${CLAUDE_PLUGIN_ROOT}/reference/stage-rules.md` and follow the common procedure. Stage key: `spec`.

## Input

- Brief (`.workflow/01-brief.md`) — target outcome, success criteria, out of scope

## Steps

1. Extract feature candidates from the brief's target outcome and propose them as a table ("Feature list"). Link each to its source section.
2. Collect via `AskUserQuestion`:
   - Priority (Must/Should/Could/Won't) — with many candidates, start with Must
   - **Core features** — what the user must be able to accomplish with this product. 1-5. They become the stage 11 usability-test tasks
3. Per feature ("Feature details"), at most 10 lines: purpose, input, behavior, result, exceptions, acceptance criteria. Put an `<a id="f-xx"></a>` anchor before each feature.
4. If a feature overlaps an out-of-scope item, flag it and ask the user.
5. Beyond 8 features, split details into `02-spec/F-xx.md` (length budget in the common rules).

## When entered via a feature-add cycle

Only add new F-ID rows to the existing table. Do not edit existing features (confirm separately if a change is needed).

## Done

After user confirmation: `status: done` → Decision log → `WFCTL sync` → `/wf-flow`.
