---
name: wf-next
description: Continue to the next vibe-workflow stage skill. Also handles re-entering a feature-add cycle and doc catch-up. For status only, use wf-progress. Use when the user says "next step", "what's next", "let's continue", "keep going", "clean up the docs", "let's add a feature".
---

# wf-next — Progress check and router

`WFCTL` = `node "${CLAUDE_PLUGIN_ROOT}/scripts/wfctl.js"`

## Procedure

1. `WFCTL sync`, then `WFCTL status`. If `.workflow` is missing, point to `/wf-init`.
2. Show the user: current phase (Planning/UX/UI/Development/Release), next stage number and name, number of hub Open questions. Do not paste the whole table; link the hub instead.
3. Run the next stage skill right away. If the user names a different stage, go there.

## After all stages are done — feature-add cycle

For a new feature request after release:

1. `AskUserQuestion`: "Feature spec first (stage 2) / Implement now (stage 10)". Recommend implementing now when the change is small.
2. If spec first, add only the new F-IDs in `/wf-spec`. Later stages cover **only the additions** (wireframe only new screens, usability-test only new tasks).
3. Revert the status of each re-entered stage document to `draft` and log "Feature-add cycle: F-xx" in the Decision log.

## Success check after release

If `.workflow/15-release.md` has `status: released`, its `check_on` date has passed and the `Success check` table is empty: run the success check first — measure each success criterion with the user (`AskUserQuestion` for what cannot be measured from data), fill the table, and turn misses into the next feature-add cycle.

## Doc catch-up

On "clean up the docs" or at a stage transition (11→12, 12→13, 14→15):

1. Scan code changes since the last catch-up with `git log`/`git diff`.
2. List features/screens missing from the docs and anything implemented differently from the docs.
3. Reflect each item in its document as **one line**, and ask via `AskUserQuestion` only what needs judgment (at most 4 at a time).
4. Move resolved hub Open questions into the Decision log and run `WFCTL sync`.
