# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

A Korean translation lives in [CLAUDE.ko.md](CLAUDE.ko.md). **This English file is the source of truth** — change it first, then mirror the change there.

## What this repository is

This is the source of the `vibe-workflow` Claude Code plugin. What gets built here is **a workflow system meant to be installed into other projects**.
This repository is not itself a target of that workflow (there is no `.workflow/` here).

## Commands

No dependencies, no build step, no test framework. Node built-ins only.

```bash
# Validate the JSON manifests (a broken one is silently ignored, so this is mandatory)
node -e "JSON.parse(require('fs').readFileSync('.claude-plugin/marketplace.json','utf8'))"
node -e "JSON.parse(require('fs').readFileSync('plugins/vibe-workflow/.claude-plugin/plugin.json','utf8'))"
node -e "JSON.parse(require('fs').readFileSync('plugins/vibe-workflow/hooks/hooks.json','utf8'))"

# Pipe-test the hooks — always do this before registering them
H=plugins/vibe-workflow/hooks
echo '{"tool_name":"Edit","tool_input":{"file_path":"/absolute/path/src/a.ts"}}' | node $H/gate-write.js
echo '{}' | node $H/gate-stop.js
echo '{}' | node $H/inject-phase.js

# Drive wfctl by hand (from a scratch directory)
node plugins/vibe-workflow/scripts/wfctl.js init
node plugins/vibe-workflow/scripts/wfctl.js status

# Local install test (load without installing)
claude --plugin-dir "$(pwd)/plugins/vibe-workflow"

# Verify the manifest actually loads — a JSON syntax check cannot catch this
claude --plugin-dir "$(pwd)/plugins/vibe-workflow" plugin details vibe-workflow

# Real install (a local path must be given in './' form)
claude plugin marketplace add ./
claude plugin install vibe-workflow@vibe-workflow
claude plugin list          # Confirm Status is enabled. Load failures also surface here
```

**Do not put a `"hooks"` field in `plugin.json`.** `hooks/hooks.json` is loaded automatically.
Referencing it again from the manifest fails the whole plugin with `Duplicate hooks file detected`.
Use `manifest.hooks` only to point at additional hook files **outside** the standard path.
A JSON syntax check will not catch this error; it shows up only in the Status column of `claude plugin list`.

After changing a hook, **verify both the blocking path and the allowing path with a pipe test.**
Always confirm the allowing path produces empty output — emitting the wrong thing there blocks all normal work.

## Architecture

### State model

The single source of truth is `.workflow/state.json` in the target project, and it holds nothing but `phase` and `task`.

**Gate results are never stored in state.json.** They are derived from the artifact files every time:

- Plan approval = the `<!-- wf:review ... decision: approved -->` marker in `tasks/<id>/review.md`
- Verification passed = in the `<!-- wf:verify ... -->` marker of `tasks/<id>/verify.md`, every item enabled in config reads `pass`

This design makes state drift impossible. Keep the same principle when adding a new gate — never cache a decision.

### Layers

```
hooks/lib/wf.js          the single home of all decision logic
   ↑ require
hooks/*.js               thin adapters (read stdin → wf.js decides → stdout)
scripts/wfctl.js         uses that same wf.js so humans and skills can change state
```

**Decision logic must live in `wf.js`.** If the hooks and wfctl judge differently, the double defense breaks.
Example: `wfctl phase build` refuses via `reviewStatus()`, and `gate-write.js` blocks via the very same `reviewStatus()`.

### What each of the four hooks does

| File | Event | Responsibility |
| --- | --- | --- |
| `gate-write.js` | PreToolUse | The only place that emits `deny`/`ask` |
| `mark-dirty.js` | PostToolUse | Accumulates edited sources into `dirty.txt` — the input to the Stop gate |
| `inject-phase.js` | UserPromptSubmit | Per-phase rule text (the `RULES` constant) |
| `gate-stop.js` | Stop | `dirty.txt` non-empty + verify not passed → block |

The order of checks in `gate-write.js` is meaningful. Promoting approval documents to `ask` must come **before** the doc-path allowance — reverse them and `review.md` matches `**/*.md` in `docGlobs` and simply passes through.

### Hook authoring rules

- **`exit 0` on every path.** Use `wf.emit()` and wrap `main()` in `try/catch`. If a hook error blocks work, users will just turn hooks off.
- **No interference means no output.** `wf.emit(null)`.
- **Do not use `jq`.** It is not available in this environment. Read stdin JSON with `wf.readStdin()`.
- **`hooks.json` uses the `args` array form.** It bypasses the shell, which keeps Windows paths containing spaces safe.
- **State the remedy alongside the reason for blocking.** "Not allowed" on its own leaves the model stuck.
- When using `decision: block` in a `Stop` hook, check `stop_hook_active` and cap the retries (`MAX_BLOCKS_PER_TASK` in `gate-stop.js`).

### Path handling

This targets Windows, so normalize with `wf.norm()` (backslash to slash, lowercased) before comparing.
The glob matcher is our own `wf.globToRe()` (it supports `**/`, `**`, `*`, `?`). Do not add a dependency.

### Time handling

Do not mix stored values with displayed values.

- **Storage, comparison, and expiry decisions use UTC ISO** (`new Date().toISOString()`).
  That covers `updated` in `state.json`, `gate.log`, and `until`/`at` in `override.json`.
- **Dates and times a human reads use the local timezone.** Use `wf.localDate()` / `wf.localStamp()`.
  That covers `{{DATE}}` in the document templates and the override expiry notice.

Using `toISOString().slice(0, 10)` for a human-facing date is UTC-based and lands a day off.
There was a real bug where documents created between 00:00 and 09:00 KST carried the previous day's date.

### Marker format

Machine-readable blocks in artifact documents are HTML comments. They sit inside human-readable documents without disturbing rendering.

```
<!-- wf:review
task: T-001
decision: approved
-->
```

Parse them with `wf.readMarker(file, kind)`. Use the same format for any new artifact.

## Code rules

### Size limits

Split when exceeded: 300 lines per file, 50 lines per function, 5 parameters, 10 branches per function.

**There is exactly one exception: `main()` in `gate-write.js`** (83 lines / 19 branches).
In that function the order of checks is itself the rule, so breaking it into helpers hides that order from the call site.
Do not split it. And do not cite this exception as precedent anywhere else.

`wfctl.js` is over the limit at 343 lines. When adding a command, consider splitting the file first.

### Verification

**Do not introduce a test framework.** Having no dependencies is a constraint of this plugin.
Verify new code with pipe tests and by driving `wfctl` by hand (see the `## Commands` section).
When you change a hook, check **both** the blocking path and the allowing path. Always confirm the allowing path emits nothing.

### Style

- Give constants names (`MAX_BLOCKS_PER_TASK`, `PHASE_MSG`, `ORDER`). Never put literals directly into a decision.
- Write guard clauses first. The standard hook shape is "if the input is not our concern, `wf.emit(null)` immediately".
- Keep side effects (file writes, stdout) at the edge. Decision functions in `wf.js` answer from their input alone.
- Catch specific exceptions. The top-level `try/catch` in a hook is the deliberate exception — it must `exit 0` on any error.
- Names reveal intent. Abstract only after the same thing has appeared three times.

## Skill authoring rules

- In skill bodies, invoke `wfctl` as `node "${CLAUDE_PLUGIN_ROOT}/scripts/wfctl.js"`
- Never let a skill edit `state.json` directly — it must go through `wfctl`
- Put **Korean phrasing that users would actually type** into the `description` in the frontmatter (the model selects skills by it)
- Where human judgment is required, instruct `AskUserQuestion` explicitly. "Ask the user" on its own gets skipped

## Limits of enforcement (keep this in the documentation)

A hook sees only file contents and **cannot know who wrote them.** So the fact that "a human approved" is not itself enforceable.
Within the current structure, the alternative is to promote writes to approval documents to `permissionDecision: "ask"` so that a real permission prompt appears.
In `bypassPermissions` / `dontAsk` mode even that is powerless.

Do not delete this limitation from the README. Documenting something as enforced when it is not destroys trust in the entire system.
