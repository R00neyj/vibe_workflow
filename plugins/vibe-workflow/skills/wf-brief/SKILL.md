---
name: wf-brief
description: vibe-workflow stage 1 (Planning). Design the final product's goal and the brief through pre-research. Settle problem, target users, references, success criteria, and out-of-scope via Q&A and write them to 01-brief.md. Use when the user says "let's write the brief", "do pre-research", "figure out what to build", "organize my idea", "start with planning".
---

# wf-brief — 1. Research & brief [Planning]

Before starting, Read `${CLAUDE_PLUGIN_ROOT}/reference/stage-rules.md` and follow the common procedure. Stage key: `brief`.

## Input

- The user's idea (conversation); existing code, if any

## Steps

1. **Q&A** — collect the following with `AskUserQuestion`. At most 4 questions per round.
   - Problem: what is painful now, how is it solved today
   - Target users: who, in what situation
   - Target outcome: what the user must be able to do at release
   - Out of scope: what will not be built this time. Scope leaks if empty. Always collect
   - Constraints: platform, tech stack preference, deploy target, schedule
2. **Reference research** — web-search 2-4 similar services and add one table line each. Collect the user's known references first. If no search tool is available, ask the user.
3. **Success criteria** — propose 3-5 observable statements and let the user choose.
4. **Write** — `01-brief.md`, within about 80 lines. If the answer is "whatever", build options and ask again; if still undecided, record it in the `Assumptions` section.
5. Also fill the hub `Overview` section (one-line definition, target users, current goal).

## Done

After user confirmation: `status: done` → Decision log → `WFCTL sync` → `/wf-spec`.
