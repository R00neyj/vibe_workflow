---
name: wf-internal-test
description: vibe-workflow stage 11 (Release). Create a guide and feedback form for internal testers other than the vibe coder, then classify and fix the feedback received. Use when the user says "internal test", "guide to send to testers", "organize the feedback", "teammate testing", "I got beta feedback".
---

# wf-internal-test — 11. Internal test [Release]

Before starting, Read `${CLAUDE_PLUGIN_ROOT}/reference/stage-rules.md` and follow the common procedure. Stage key: `internal-test`.
You cannot contact testers directly. Write the guide, have the user deliver it, and have them paste back the feedback.

## 1. Write the guide

1. `WFCTL new internal-test` creates `11-internal-test.md` and `11-tester-guide.md`.
2. Write `11-tester-guide.md`: what this is in a sentence or two, the pre-release URL (`.workflow/10-prerelease.md`), test account and period, things to try.
   - Reuse the usability-test task prompts (`.workflow/09-usability.md`) for things to try. **Goal only, no method.** No internal links or facilitator info
   - Testers read this, so use plain words and keep it within one screen
3. Collect tester count, period, and feedback channel via `AskUserQuestion` and record them in the tester table.
4. Tell the user the guide can be copied and sent as is.

## 2. Handle feedback

When the user pastes feedback:

1. One line per item as I-xx: tester, task/screen, content (summary), category (bug / usability / request), severity (blocker / major / minor).
2. Merge duplicates into one and show only the count.
3. Propose an action and settle it via `AskUserQuestion`: fix / defer / reject. Blockers default to fix.
4. For UI fixes, read `DESIGN.md` first and stay within its tokens and components (log new ones there).
5. If a redeploy is needed after fixes, deploy a new rc version via `/wf-prerelease` and record the included IDs in the redeploy table.
6. Handle feature requests per the common rules' `Doc involvement level` — ask whether to include them in this release.

## Done

With 0 blocker issues and an action settled for every item: confirm via `AskUserQuestion` → `status: done` → one doc catch-up from `/wf-next` → `WFCTL sync` → `/wf-release`.
