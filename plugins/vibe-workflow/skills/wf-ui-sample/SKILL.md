---
name: wf-ui-sample
description: vibe-workflow stage 8 (UI, full mode). Render the DESIGN.md tokens on one or two real screens — usually the main screen of the core flow — as static HTML/CSS, so the look is checked before tech design and the prototype. Use when the user says "apply the design tokens", "see the real look", "style the main screen", "hi-fi key screen", "check the tokens on a real screen", "does the design system hold up".
---

# wf-ui-sample — 8. Styled key screens [UI]

Before starting, Read `${CLAUDE_PLUGIN_ROOT}/reference/stage-rules.md` and follow the common procedure. Stage key: `ui-sample`.
Skipped in lite mode: then `/wf-prototype` does the same job in its "Tokens and components first" and "Design check" steps.
Static HTML/CSS only: the stack is chosen later (stage 9), so nothing here depends on one.

## Input

- `DESIGN.md` (project root) — tokens and components. **Read before writing any CSS**
- Wireframes (`.workflow/06-wireframe/`) and review notes (`.workflow/07-wireframe-review.md`) — layout, copy, leftover notes
- UX flow (`.workflow/03-flow.md`) and feature spec (`.workflow/02-spec.md`) — Core features
- `${CLAUDE_PLUGIN_ROOT}/reference/ui-anti-slop.md`

## Steps

1. **Pick 1–2 screens** — `AskUserQuestion` with the flow's screens, recommended first: the screen where the Core feature's main task happens (usually the main screen). Add a second only if it covers what the first does not (a form or input, a list, heavy states). Not every screen.
2. **Tokens to code** — `.workflow/08-ui-sample/tokens.css`: every DESIGN.md token as a CSS variable, names mirrored (`color.primary` → `--color-primary`). Include unused tokens too, so gaps show up.
3. **Build the screens** — `.workflow/08-ui-sample/<slug>.html` + `styles.css`. Wireframe layout and copy, DESIGN.md components with the states that matter. Real color, type, spacing, radius, shadow. Rules:
   - Only `var(--…)`; no raw color or size values outside `tokens.css`. Search to confirm (`#[0-9a-fA-F]{3,8}`, `\d+px`)
   - A needed component or token that is missing → add it to DESIGN.md first (Change log), then to the CSS
4. **Look at it** — open the pages in a browser at the target widths and capture each (browser tool if available, otherwise ask the user for screenshots). Compare with DESIGN.md and the anti-slop checklist. Where a token looks wrong in use (contrast, rhythm, scale), change **DESIGN.md**, not the CSS alone.
5. **Record** — in `08-ui-sample.md`: the screens and why, the token coverage table, DESIGN.md changes, what the prototype reuses. Keep it short.

## Done

Show the user the file paths, then `AskUserQuestion`: "Looks right / Adjust tokens / Change the screen choice". Fix and re-check until approved.
Then `status: done` → `WFCTL sync` → `/wf-tech`.
