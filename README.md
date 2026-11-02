# vibe-workflow

A Claude Code plugin that guides vibe coding through 12 stages: **Planning → UX → UI → Development → Release**.
You build with one hub document and a wiki of per-stage documents. No blocking hooks — everything is a skill. A read-only progress panel appears on the right side of the screen.

## Flow

| Phase | # | Stage | Artifact (`.workflow/`) | Skill |
| --- | --- | --- | --- | --- |
| Planning | 1 | Research & brief | `01-brief.md` | `/wf-brief` |
| Planning | 2 | Feature spec | `02-spec.md` | `/wf-spec` |
| UX | 3 | UX flowchart | `03-flow.md` (mermaid) | `/wf-flow` |
| UI | 4 | UI references (screen-level layouts, components, interactions, visual direction) | `04-references.md` | `/wf-references` |
| UI | 5 | Design system — design tokens + component definitions | **`DESIGN.md`** (project root) | `/wf-design` |
| UI | 6 | Low-fi wireframe | `06-wireframe/*.html` | `/wf-wireframe` |
| UI | 7 | Wireframe review (user approval) | `07-wireframe-review.md` | `/wf-wireframe-review` |
| Development | 8 | Prototype | source code + `08-prototype.md` | `/wf-prototype` |
| Development | 9 | Usability test (give only the goal → investigate where users get stuck → fix) | `09-usability.md` | `/wf-usability` |
| Release | 10 | Pre-release | `10-prerelease.md` | `/wf-prerelease` |
| Release | 11 | Internal test | `11-internal-test.md`, `11-tester-guide.md` | `/wf-internal-test` |
| Release | 12 | Release | `12-release.md` | `/wf-release` |

## DESIGN.md — the UI source of truth

`/wf-design` writes `DESIGN.md` at the project root right after the UI references: semantic tokens (color, typography, spacing, radius, shadow, motion, breakpoints) and component definitions (variants, states, tokens used, screens).
It never "finishes". The wireframe labels boxes with its component names, the prototype turns its tokens into code first, and every later UI fix (usability, internal test, ad-hoc requests) reads it first and uses only its tokens and components. New tokens and components are added there, with a Change log line, before they are used.
Optionally `/wf-design` adds one line to the project's `CLAUDE.md` so UI work outside the stages also reads it.

No need to memorize stage names. Say **"next step"** and `/wf-next` looks at where you are and continues.

```
/wf-init      Install — create .workflow/ and the hub
/wf-next      Run the next stage. Feature-add cycles and doc catch-up also go here
/wf-progress  View progress only (runs nothing)
/progress     Open the progress panel
```

## Progress panel

Opening a session in a project with `.workflow/` shows the progress panel. Its only data source is `wfctl status --json` (read-only).

```
vibe-workflow · 6/12
[-] ✓ Planning    ██████ 2/2
        ✓ 1. Research & brief
        ✓ 2. Feature spec
[+] ✓ UX          ██████ 1/1
[-] ▶ UI          █████░ 3/4
        ✓ 4. UI references
        ✓ 5. Design system (DESIGN.md)
        ✓ 6. Low-fi wireframe
        ▶ 7. Wireframe review
[+] · Development ░░░░░░ 0/2
[+] · Release     ░░░░░░ 0/3

Prev 6. Low-fi wireframe
Now  7. Wireframe review → /wf-wireframe-review
Next 8. Prototype
```

- Wide window (about 110+ columns): docks on the right. `[+]`/`[-]` expands a phase (the current phase is expanded by default).
- Narrow window: a single status line below the prompt — `Progress 6/12 ▶ [UI] 7. Wireframe review → /wf-wireframe-review · Next 8. Prototype`
- `/progress`: opens the panel and prints the full stage list as text.
- Refresh: 1.5 seconds after a Bash, Edit, Write, Skill, or Agent call, plus every 30 seconds.
- Injects nothing into prompts or tool calls and blocks nothing. Does nothing in projects without `.workflow/`.

## Document structure — hub + wiki

```
DESIGN.md              Design tokens + components (project root, living doc)
.workflow/
├── README.md          Hub: overview · progress table · decision log · open questions
├── 01-brief.md        Each doc has a ← Hub · Prev · Next nav at the top
├── 02-spec.md         Features are F-01 anchors; other docs link like [F-01](02-spec.md#f-01)
├── ...
└── config.json        Check, run, and deploy commands
```

- Opening just the hub shows the whole flow and the current position.
- The hub's progress table is redrawn by `wfctl sync` from each doc's marker (`<!-- wf:spec status: done -->`). Completion is not stored separately, so docs and state cannot drift apart.
- Keep docs short: a 3-line `At a glance` summary per doc, mostly tables, and split into subpages when over the length budget.

## How docs relate to code

Docs are a tool for keeping direction aligned, not a permit. The level of involvement depends on the size of the change.

| Change size | Example | Doc involvement |
| --- | --- | --- |
| small | copy, styling, bug | Docs untouched |
| medium | adding a feature or screen | Implement right away, then add one line to the docs afterward |
| large | changing a core feature, target users, or goals | Asked once before implementing. Proceeds with either answer |

Doc cleanup is batched into "doc catch-up" in `/wf-next` at stage transitions (9→10, 11→12).
Detailed rules: [`plugins/vibe-workflow/reference/stage-rules.md`](plugins/vibe-workflow/reference/stage-rules.md)

## What is not enforced

There are no blocking or injecting hooks (the progress panel only displays). **Nothing is mechanically enforced.**

- Stage order is a convention. If a prior stage is incomplete the skill asks, but does not block.
- At points needing human judgment (wireframe approval, usability test results, internal test handling policy, release decision), the skill is instructed to ask via `AskUserQuestion`. Nothing prevents the model from skipping it.
- The `status` in a doc marker is written by the model. The convention only says to change it after user confirmation.
- `wfctl check` judges by the real exit code, but it is the model that copies the result into the doc.

## Install

**Requirements**: Node.js (built-in modules only)

```bash
claude plugin marketplace add R00neyj/vibe_workflow   # or ./ from the repository root
claude plugin install vibe-workflow@vibe-workflow
claude plugin list                                   # Confirm Status: enabled
```

For team distribution, commit this to the consuming project's `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "vibe-workflow": {
      "source": { "source": "github", "repo": "R00neyj/vibe_workflow", "ref": "main" }
    }
  },
  "enabledPlugins": { "vibe-workflow@vibe-workflow": true }
}
```

While developing the plugin, skip installing and use `claude --plugin-dir "$(pwd)/plugins/vibe-workflow"`.

### Upgrading from 0.1.x

Not compatible. The 0.1.x `.workflow/` (state.json, tasks/) is not read. Run `wfctl init` fresh and move what you need into the new docs.

From 0.2.x/0.3.x: 0.4.0 inserts stages 4 (UI references) and 5 (DESIGN.md), so stage files from 04 on were renumbered (`04-wireframe` → `06-wireframe`, … `10-release.md` → `12-release.md`). Rename the files in `.workflow/` to the new numbers, then `wfctl sync`.

## wfctl

The CLI the skills use. Humans can use it directly too.

```bash
WF="node <plugin>/scripts/wfctl.js"
$WF init                     # create .workflow/config.json + hub (auto-detects check/run commands)
$WF status [--json]          # progress across the 12 stages and the next stage (--json: for the panel)
$WF sync                     # regenerate the hub progress table
$WF new spec                 # create a stage doc (by key or number: new 2)
$WF screen home "Home"       # create a wireframe screen file
$WF check                    # run the checks from config
$WF deploy prerelease        # run the deploy command from config
$WF doctor
```

## Config

`.workflow/config.json`:

```jsonc
{
  "checks": {
    "test":      { "enabled": true,  "command": "npm run test --silent" },
    "build":     { "enabled": true,  "command": "npm run build --silent" },
    "lint":      { "enabled": false, "command": "" },
    "typecheck": { "enabled": true,  "command": "npx tsc --noEmit" }
  },
  "run": "npm run dev",
  "deploy": { "prerelease": "", "release": "" }
}
```

If `deploy` is empty, the skill guides a manual deploy and only records the result.

## Layout

```
.claude-plugin/marketplace.json
plugins/vibe-workflow/
├── .claude-plugin/plugin.json
├── reference/stage-rules.md    Rules shared by stage skills (doc structure, length, involvement level, links)
├── hooks/register.tsx          Progress panel mod (read-only UI)
├── types/index.d.ts            Panel state type contract
├── scripts/wfctl.js            CLI
├── scripts/lib/wf.js           Stage definitions, marker parsing, progress judgment, hub rendering
├── skills/wf-*/SKILL.md        15 skills
└── templates/                  Hub + stage docs + wireframe HTML
```

## License

MIT
