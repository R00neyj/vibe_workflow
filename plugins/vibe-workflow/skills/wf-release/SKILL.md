---
name: wf-release
description: vibe-workflow stage 14 (Release). Check the evidence for the release decision, write release notes, and deploy officially. Use when the user says "release", "official deploy", "ship it", "production deploy", "release notes".
---

# wf-release — 14. Release [Release]

Before starting, Read `${CLAUDE_PLUGIN_ROOT}/reference/stage-rules.md` and follow the common procedure. Stage key: `release`.
**The user makes the release decision.** Never decide for them.

## Steps

1. **Check the evidence** — actually cross-check the template checklist against the documents and mark each item with a link to its source document.
   - Success criteria → brief (`.workflow/01-brief.md`), Must features → feature spec (`.workflow/02-spec.md`), core tasks → usability test (`.workflow/10-usability.md`), acceptance criteria → hardening (`.workflow/11-hardening.md`), blocker issues → internal test (`.workflow/13-internal-test.md`, full mode)
   - Actually run `WFCTL check`
2. **Deferred issues** — list the items deferred in hardening and the internal test as a table.
3. **Release notes** — user-facing changes in at most 5 lines. For a feature-add cycle, only the additions.
4. **Decision** — show the check results and `AskUserQuestion`: "Release / Hold". Even with unmet items, if the user chooses to proceed, proceed and log the reason in the Decision log.
5. **Deploy** — if `deploy.release` exists, confirm once more right before running, then `WFCTL deploy release`. Otherwise guide the manual steps.
6. **Success check date** — set marker `check_on` (default: today + 14 days, local date; ask if the user wants another date). Fill the `Success check` table's criteria rows from the brief, results left empty. `/wf-next` runs the check once the date has passed.
7. **Verify and record** — confirm the URL is reachable; record version, date/time, URL, rollback method. Marker `version`, `url`. In a git repository, propose a tag (`v<version>`); commit, tag, and push only after user confirmation.

## Done

`status: released` → Decision log → `WFCTL sync`. Tell the user the success check date. Point the next feature to the feature-add cycle in `/wf-next`.
In lite mode there is no pre-release: deploy straight to the release target after hardening.
