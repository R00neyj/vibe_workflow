---
name: wf-usability
description: vibe-workflow stage 7 (Development). Run a prototype usability test. Derive tasks from the core features in the brief and feature spec, give only the goal with no steps, investigate where the user got stuck, then fix and retest. Use when the user says "usability test", "I'll test it", "what's awkward when I use it", "user test", "test the prototype".
---

# wf-usability — 7. Usability test [Development]

Before starting, Read `${CLAUDE_PLUGIN_ROOT}/reference/stage-rules.md` and follow the common procedure. Stage key: `usability`.

## Principles

- **Give the goal only. Never give the method.** Do not put menu names, button names, screen names, or order into task prompts.
- If the user asks how during the test, do not answer right away; first record "Where did you look first?". If they stay stuck, help, and log the result as `success with help`.
- **Never write success criteria or expected paths anywhere until the round ends.** File-write content is visible on the user's screen, so writing it in the document exposes it. Keep it in context only, and do not mention screen names, button names, or paths in chat either.

## Steps

1. **Derive tasks** — 3-5 tasks from the core features in the feature spec (`.workflow/02-spec.md`) and the success criteria in the brief (`.workflow/01-brief.md`). Decide success criteria and expected paths in your head only.
2. **Task prompts** — only the user's situation and goal. Example: "You want to let your friends know about dinner next Friday." (not "Click the Add Event button to create an event.") Write only these prompts into the `Task prompts shown to the user` section.
3. **Run** — explain how to run the prototype, then present tasks **one at a time**. After each task, collect three questions in one `AskUserQuestion`:
   - Result: success / success with help / fail
   - Difficulty: very hard (1) / hard (2) / easy (3) / very easy (4)
   - Stuck: none / something confusing / couldn't find something — details via Other free input
   If "something confusing" or "couldn't find something" has no details, ask once more where and what they expected. Record the user's words verbatim in the `Round 1` table.
4. **Facilitator table** — only after every task in the round is done, fill the `Facilitator only — fill in after the round ends` table (source feature, success criteria, expected path).
5. **Issues** — group stuck points into issues (U-xx) in `Issues and fixes` with severity: high (fail or needed help), medium (difficulty 2 or lower), low. One line on the cause: screen, copy, or flow.
6. **Fix** — fix from high severity down. If a fix is large, handle it per the common rules' `Doc involvement level`. Record the fixed files in the table.
7. **Retest** — present only the fixed tasks in a new round. Keep the same goal but change the situation in the prompt to reduce learning effects.

## Done

When all core tasks are `success` in the latest round: confirm via `AskUserQuestion` → `status: done` → one doc catch-up from `/wf-next` → `WFCTL sync` → `/wf-prerelease`.
If the same task still fails after 3 rounds, propose revisiting the wireframes and flow.
