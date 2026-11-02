# vibe-workflow

A Claude Code plugin that guides vibe coding through 14 stages (9 in lite mode): **Planning → UX → UI → Development → Release**.
You build with one hub document and a wiki of per-stage documents. No blocking hooks — everything is a skill. A read-only progress panel appears on the right side of the screen.

## Flow

| Phase | # | Stage | Artifact (`.workflow/`) | Skill |
| --- | --- | --- | --- | --- |
| Planning | 1 | Research & brief | `01-brief.md` | `/wf-brief` |
| Planning | 2 | Feature spec | `02-spec.md` | `/wf-spec` |
| UX | 3 | UX flowchart | `03-flow.md` (mermaid) | `/wf-flow` |
| UI | 4 | UI references * (screen-level layouts, components, interactions, visual direction) | `04-references.md` | `/wf-references` |
| UI | 5 | Design system — design tokens + component definitions | **`DESIGN.md`** (project root) | `/wf-design` |
| UI | 6 | Low-fi wireframe | `06-wireframe/*.html` | `/wf-wireframe` |
| UI | 7 | Wireframe review * (user approval) | `07-wireframe-review.md` | `/wf-wireframe-review` |
| Development | 8 | Tech design * (stack, data model, API, auth, environments) | `08-tech.md` | `/wf-tech` |
| Development | 9 | Prototype (+ design check against DESIGN.md) | source code + `09-prototype.md` | `/wf-prototype` |
| Development | 10 | Usability test (self-test: give only the goal → find where it gets stuck → fix) | `10-usability.md` | `/wf-usability` |
| Development | 11 | Hardening & verification (acceptance criteria with evidence, errors, edge cases, security, a11y) | `11-hardening.md` | `/wf-hardening` |
| Release | 12 | Pre-release * | `12-prerelease.md` | `/wf-prerelease` |
| Release | 13 | Internal test * (real usability findings from other people) | `13-internal-test.md`, `13-tester-guide.md` | `/wf-internal-test` |
| Release | 14 | Release (+ success check on `check_on`, default 14 days later) | `14-release.md` | `/wf-release` |

* skipped in lite mode.

## Modes

`/wf-init` asks which one; switch any time with `wfctl mode <lite|full>`.

| Mode | Stages | For |
| --- | --- | --- |
| `full` | all 14 | a product others will use |
| `lite` | 9 — skips 4, 7, 8, 12, 13 | small or personal projects; code starts at stage 9 after 5 short docs |

In lite mode the neighbouring skills absorb the essentials: `/wf-design` asks for 1–2 liked apps instead of a references stage, `/wf-wireframe` ends with a quick approval, `/wf-prototype` picks the stack, `/wf-release` deploys straight after hardening.

## DESIGN.md — the UI source of truth

`/wf-design` writes `DESIGN.md` at the project root right after the UI references: semantic tokens (color, typography, spacing, radius, shadow, motion, breakpoints) and component definitions (variants, states, tokens used, screens).
It never "finishes". The wireframe labels boxes with its component names, the prototype turns its tokens into code first, and every later UI fix (hardening, usability, internal test, ad-hoc requests) reads it first and uses only its tokens and components. New tokens and components are added there, with a Change log line, before they are used.
**No AI slop.** [`reference/ui-anti-slop.md`](plugins/vibe-workflow/reference/ui-anti-slop.md) lists the default look models fall into — Inter-everything, purple gradients, glass cards, icon-tile feature rows, "seamless" copy — with an alternative for each and grep-able detection searches. References (4), DESIGN.md (5), the prototype design check (9) and hardening (11) apply it; a listed pattern is allowed only as a DESIGN.md `Deliberate exception` with a reason. Distilled from [impeccable](https://github.com/pbakaus/impeccable), [taste-skill](https://github.com/Leonxlnx/taste-skill) and [zero-slop](https://github.com/Eid0lon/zero-slop).

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
vibe-workflow · 6/14
[-] ✓ Planning    ██████ 2/2
        ✓ 1. Research & brief
        ✓ 2. Feature spec
[+] ✓ UX          ██████ 1/1
[-] ▶ UI          █████░ 3/4
        ✓ 4. UI references
        ✓ 5. Design system (DESIGN.md)
        ✓ 6. Low-fi wireframe
        ▶ 7. Wireframe review
[+] · Development ░░░░░░ 0/4
[+] · Release     ░░░░░░ 0/3

Prev 6. Low-fi wireframe
Now  7. Wireframe review → /wf-wireframe-review
Next 8. Tech design
```

- Wide window (about 110+ columns): docks on the right. `[+]`/`[-]` expands a phase (the current phase is expanded by default).
- Narrow window: a single status line below the prompt — `Progress 6/14 ▶ [UI] 7. Wireframe review → /wf-wireframe-review · Next 8. Tech design` (lite mode adds `· lite` to the panel header)
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

Doc cleanup is batched into "doc catch-up" in `/wf-next` at stage transitions (10→11, 11→12, 13→14).
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

From 0.2.x–0.4.x: 0.5.0 numbers stage files after their stage (14 stages): `04-references.md`, `06-wireframe/`, `07-wireframe-review.md`, `08-tech.md`, `09-prototype.md`, `10-usability.md`, `11-hardening.md`, `12-prerelease.md`, `13-internal-test.md`, `14-release.md`, and `DESIGN.md` at the project root. Rename existing files to these names, then `wfctl sync`.

## wfctl

The CLI the skills use. Humans can use it directly too.

```bash
WF="node <plugin>/scripts/wfctl.js"
$WF init [--mode lite]       # create .workflow/config.json + hub (auto-detects check/run commands)
$WF status [--json]          # progress and the next stage (--json: for the panel)
$WF mode lite                # switch mode (full | lite)
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
  "mode": "full",
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
├── reference/ui-anti-slop.md   AI-slop UI patterns, alternatives, detection searches
├── hooks/register.tsx          Progress panel mod (read-only UI)
├── types/index.d.ts            Panel state type contract
├── scripts/wfctl.js            CLI
├── scripts/lib/wf.js           Stage definitions, marker parsing, progress judgment, hub rendering
├── skills/wf-*/SKILL.md        17 skills
└── templates/                  Hub + stage docs + wireframe HTML
```

## License

MIT
