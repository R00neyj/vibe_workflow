---
name: wf-release
description: vibe-workflow stage 12 (Release). Check the evidence for the release decision, write release notes, and deploy officially. Use when the user says "release", "official deploy", "ship it", "production deploy", "release notes".
---

# wf-release — 12. Release [Release]

Before starting, Read `${CLAUDE_PLUGIN_ROOT}/reference/stage-rules.md` and follow the common procedure. Stage key: `release`.
**The user makes the release decision.** Never decide for them.

## Steps

1. **Check the evidence** — actually cross-check the template checklist against the documents and mark each item with a link to its source document.
   - Success criteria → brief (`.workflow/01-brief.md`), Must features → feature spec (`.workflow/02-spec.md`), core tasks → usability test (`.workflow/09-usability.md`), blocker issues → internal test (`.workflow/11-internal-test.md`)
   - Actually run `WFCTL check`
2. **Deferred issues** — list the items deferred in the internal test as a table.
3. **Release notes** — user-facing changes in at most 5 lines. For a feature-add cycle, only the additions.
4. **Decision** — show the check results and `AskUserQuestion`: "Release / Hold". Even with unmet items, if the user chooses to proceed, proceed and log the reason in the Decision log.
5. **Deploy** — if `deploy.release` exists, confirm once more right before running, then `WFCTL deploy release`. Otherwise guide the manual steps.
6. **Verify and record** — confirm the URL is reachable; record version, date/time, URL, rollback method. Marker `version`, `url`. In a git repository, propose a tag (`v<version>`); commit, tag, and push only after user confirmation.

## Done

`status: released` → Decision log → `WFCTL sync`. Point the next feature to the feature-add cycle in `/wf-next`.
