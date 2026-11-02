# Common stage rules

Every `wf-*` stage skill follows this document before starting.

`WFCTL` = `node "${CLAUDE_PLUGIN_ROOT}/scripts/wfctl.js"`

## Document structure — hub + wiki

```
DESIGN.md                   5. Design system — project root, living doc      [UI]
.workflow/
├── README.md               hub. Overall flow, progress table, decision log, open questions
├── config.json             mode, checks, run, deploy
├── 01-brief.md             1. Research & brief          [Planning]
├── 02-spec.md              2. Feature spec              [Planning]
├── 03-flow.md              3. UX flowchart              [UX]
├── 04-references.md        4. UI references *           [UI]
├── 06-wireframe/           6. Mid-fi wireframe          [UI]
├── 07-wireframe-review.md  7. Wireframe review *        [UI]
├── 08-tech.md              8. Tech design *             [Development]
├── 09-prototype.md         9. Prototype                 [Development]
├── 10-usability.md         10. Usability test           [Development]
├── 11-hardening.md         11. Hardening & verification [Development]
├── 12-prerelease.md        12. Pre-release *            [Release]
├── 13-internal-test.md     13. Internal test *          [Release]
├── 13-tester-guide.md          Guide handed to testers
└── 14-release.md           14. Release                  [Release]
* skipped in lite mode
```

## Modes

`.workflow/config.json` `mode`: `full` (14 stages) or `lite` (9 stages; skips 4, 7, 8, 12, 13). Switch with `WFCTL mode <lite|full>`.

- Skipped stages are never "next" and are not counted. The skills of the stages around them absorb the essentials (each skill says how under "lite mode").
- The next skill to point to is always the `Next:` line of `WFCTL status`, which already skips what the mode leaves out.
- The user may still run a skipped stage's skill by hand; switch to `full` if they want it tracked.

- The hub (`README.md`) is the only entry point. Opening it tells the user how far along things are.
- **Never write by hand** between `<!-- wf:index:begin -->` and `<!-- wf:index:end -->` in the hub. `WFCTL sync` redraws it.
- Skills update the hub's Overview, Decision log, and Open questions sections directly.

## Readable documents

The user must be able to read a document in 1-2 minutes. A long document goes unread, and an unread document might as well not exist.

- Right below the `> Done when` line in the template, put an **`At a glance` summary of at most 3 lines** (section `## At a glance`). Busy users read only this.
- Tables and lists over prose. One item per line. No background, generalities, or repetition.
- If a template section does not apply, end it with a one-line `N/A` or delete the section.
- Length budget (body only; split when exceeded):

| Document | Budget |
| --- | --- |
| Hub README.md | One screen (about 60 lines). If the Decision log passes 30 lines, move older lines to `decisions.md` and link it |
| Brief | About 80 lines |
| Feature spec | At most 10 lines per feature. Beyond 8 features, split details into `02-spec/F-xx.md` subpages and link them from the list table |
| Flow | At most 20 mermaid nodes. Beyond that, split into per-task subflows |
| DESIGN.md | About 100 lines, tables only |
| Others | About 60 lines |

- Subpages also carry a `[← Parent document](../02-spec.md)` nav line at the top.

## DESIGN.md — the UI source of truth

`DESIGN.md` (project root) holds the design tokens and component definitions. Unlike stage docs it never "finishes".

- **Read it before any UI work**: wireframe, prototype, usability fixes, hardening, internal-test fixes, and any UI request outside the stages.
- Use only its tokens and components. Never hardcode a color, size, spacing, radius, shadow or duration that is not a token.
- Need something new → add it to DESIGN.md (table row + Change log line), then use it. A new variant or token is a medium change: do it, no question. Changing a core token (primary color, font) that touches every screen is large: ask once.
- Code tokens mirror DESIGN.md names (e.g. `color.primary` → `--color-primary`). If code and DESIGN.md drift, fix the code to match, or ask which one is right.
- Avoid AI-slop defaults: follow `ui-anti-slop.md` (same folder as this file). An item from it is allowed only when DESIGN.md lists it as a deliberate exception.
- Link to it from stage docs as `[DESIGN.md](../DESIGN.md)`.

## Doc involvement level — docs never block code

Vibe-coding speed comes first. Documents are a **tool for aligning direction**, not a permit.
When the user wants something, do it first and catch the docs up afterward.

| Change size | Examples | Involvement |
| --- | --- | --- |
| small | Copy, styling, bug fixes, refactoring | Leave docs alone. Just do it |
| medium | Add/change a feature, add a screen | Implement right away. After finishing, reflect **one line** in the relevant doc (add a spec table row, add to the screen list) + 1 Decision log line. Do not ask |
| large | Change a core feature or core task, change target users or goals, implement an out-of-scope item | Before implementing, `AskUserQuestion` **once**: "Update planning, then proceed / Implement now, docs later". Proceed either way |

- On finding a doc/code mismatch, do not stop work. Leave one line in hub Open questions and continue.
- Do the doc catch-up in one batch when crossing stages (especially 10 → 11, 11 → 12, 13 → 14).
- Never refuse or defer a user request because "the docs must be fixed first".

## Wiki link rules

- When mentioning another document, **always use a relative link.** Never write a bare file name.
- Link features by ID: `[F-01](02-spec.md#f-01)`. When adding a new feature, also add an `<a id="f-xx"></a>` anchor in `02-spec.md`.
- Link screens by slug: `[home](06-wireframe/home.html)`.
- Link task/issue IDs (T1, U-01, I-01) to the document that defines them.
- Do not delete the nav line at the top of a document (`← Hub · Prev · Next`).

## Progress

- Progress is derived only from each document's `<!-- wf:<stage> status: ... -->` marker. Never store "done" anywhere else.
- Done values: `done` for most. Review `approved`, pre-release `deployed`, release `released`.
- Change a marker `status` to a done value **only after the user confirms via AskUserQuestion.**

## Common stage procedure

1. **Locate** — `WFCTL status`. If `.workflow` is missing, point to `/wf-init` and stop.
2. **Check prerequisites** — if an earlier stage is incomplete, `AskUserQuestion`: "Do the prerequisite stage first" / "Proceed anyway". Do not block. If proceeding anyway, record it in the Decision log.
3. **Create the document** — `WFCTL new <stage key>`. If it already exists, continue writing it; never overwrite.
4. **Read inputs** — actually read the upstream documents the skill names. Never write without reading.
5. **Write** — do not guess what you do not know; ask with `AskUserQuestion`. At most 4 questions at a time, with concrete options. If something stays undecided, record it in the document's assumptions section or hub Open questions.
6. **Confirm** — summarize the result and get "Done / Needs changes" via `AskUserQuestion`.
7. **Wrap up** — if done: set the marker status to its done value → add one Decision log line to the hub (date, stage, decision, link to evidence) → `WFCTL sync` → point to the next skill (the `Next:` line of `WFCTL status`).

## Going back

- When editing a completed upstream document, find the downstream documents that link to it and check whether they are affected.
- If affected, tell the user and ask via `AskUserQuestion` whether to revert the downstream document's status to `draft`.
- Record the change in the Decision log.

## Dates

- Dates written in documents are local dates (`YYYY-MM-DD`). wfctl fills `{{DATE}}` in templates.
