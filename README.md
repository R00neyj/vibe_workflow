# vibe-workflow

A Claude Code plugin that guides vibe coding through 10 stages: **Planning → UX → UI → Development → Release**.
You build with one hub document and a wiki of per-stage documents. No blocking hooks — everything is a skill. A read-only progress panel appears on the right side of the screen.

## Flow

| Phase | # | Stage | Artifact (`.workflow/`) | Skill |
| --- | --- | --- | --- | --- |
| Planning | 1 | Research & brief | `01-brief.md` | `/wf-brief` |
| Planning | 2 | Feature spec | `02-spec.md` | `/wf-spec` |
| UX | 3 | UX flowchart | `03-flow.md` (mermaid) | `/wf-flow` |
| UI | 4 | Low-fi wireframe | `04-wireframe/*.html` | `/wf-wireframe` |
| UI | 5 | Wireframe review (user approval) | `05-wireframe-review.md` | `/wf-wireframe-review` |
| Development | 6 | Prototype | source code + `06-prototype.md` | `/wf-prototype` |
| Development | 7 | Usability test (give only the goal → investigate where users get stuck → fix) | `07-usability.md` | `/wf-usability` |
| Release | 8 | Pre-release | `08-prerelease.md` | `/wf-prerelease` |
| Release | 9 | Internal test | `09-internal-test.md`, `09-tester-guide.md` | `/wf-internal-test` |
| Release | 10 | Release | `10-release.md` | `/wf-release` |

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
vibe-workflow · 4/10
[-] ✓ Planning    ██████ 2/2
        ✓ 1. Research & brief
        ✓ 2. Feature spec
[+] ✓ UX          ██████ 1/1
[-] ▶ UI          ███░░░ 1/2
        ✓ 4. Low-fi wireframe
        ▶ 5. Wireframe review
[+] · Development ░░░░░░ 0/2
[+] · Release     ░░░░░░ 0/3

Prev 4. Low-fi wireframe
Now  5. Wireframe review → /wf-wireframe-review
Next 6. Prototype
```

- Wide window (about 110+ columns): docks on the right. `[+]`/`[-]` expands a phase (the current phase is expanded by default).
- Narrow window: a single status line below the prompt — `vibe-workflow 4/10 ▶ [UI] 5. Wireframe review → /wf-wireframe-review · Next 6. Prototype`
- `/progress`: opens the panel and prints the full stage list as text.
- Refresh: 1.5 seconds after a Bash, Edit, Write, Skill, or Agent call, plus every 30 seconds.
- Injects nothing into prompts or tool calls and blocks nothing. Does nothing in projects without `.workflow/`.

## Document structure — hub + wiki

```
.workflow/
├── README.md          Hub: overview · progress table · decision log · open questions
├── 01-brief.md        Each doc has a ← Overall flow · Prev · Next nav at the top
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

Doc cleanup is batched into "doc catch-up" in `/wf-next` at stage transitions (7→8, 9→10).
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

## wfctl

The CLI the skills use. Humans can use it directly too.

```bash
WF="node <plugin>/scripts/wfctl.js"
$WF init                     # create .workflow/config.json + hub (auto-detects check/run commands)
$WF status [--json]          # progress across the 10 stages and the next stage (--json: for the panel)
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
├── skills/wf-*/SKILL.md        13 skills
└── templates/                  Hub + stage docs + wireframe HTML
```

## License

MIT
