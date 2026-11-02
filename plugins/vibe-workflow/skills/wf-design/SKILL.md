---
name: wf-design
description: vibe-workflow stage 5 (UI). Define the design system before drawing — design tokens (color, typography, spacing, radius, shadow, motion) and component definitions (variants, states) — in DESIGN.md at the project root. Also use to add or change a token or component later. Use when the user says "design tokens", "design system", "define components", "make DESIGN.md", "color palette", "typography", "add a component", "change the primary color".
---

# wf-design — 5. Design system (DESIGN.md) [UI]

Before starting, Read `${CLAUDE_PLUGIN_ROOT}/reference/stage-rules.md` and follow the common procedure. Stage key: `design`.
`WFCTL new design` creates `DESIGN.md` at the **project root**, not under `.workflow/`. It is a living doc: every later UI stage and every UI fix reads it.

## Input

- UI references (`.workflow/04-references.md`) — picked visual direction, patterns to adopt
- UX flow (`.workflow/03-flow.md`) — screens, to know which components are needed
- Feature spec (`.workflow/02-spec.md`) — inputs and results each screen shows
- Existing code, if any — CSS variables, theme files, Tailwind config. Extract what exists; do not invent tokens that conflict with it

## Steps

In lite mode (no stage 4), first ask via `AskUserQuestion` for 1–2 apps or sites whose look the user likes, and derive the direction from them.


1. **Key choices** — `AskUserQuestion` with 2–4 concrete options each, derived from the picked direction: primary color, font family, density (compact / comfortable), corner style (sharp / soft / round).
2. **Tokens** — fill the token tables with semantic names (`color.primary`, not `blue-500`) and real values. Check text/background contrast is at least 4.5:1 and fix pairs that fail.
3. **Components** — inventory the UI elements the screens need (from flow + spec). Only what screens use. Each row: purpose, variants, states (always include disabled / error / loading where they apply), tokens used, screens.
4. **Patterns** — layout grid, empty/loading/error states, forms. One line each.
5. **Keep it referenced** — `AskUserQuestion`: "Add a line to the project CLAUDE.md so every UI change reads DESIGN.md? / No". If yes, add one line: `UI work: read DESIGN.md first; use only its tokens and components, and log new ones there.`
6. Keep it within about 100 lines. Tables, no prose.

## Later changes (any stage)

When a token or component is added or changed: update the table, add a Change log line (date, change, why), then update the code tokens to match. Follow the common rules' `Doc involvement level`: no question needed for an added variant; ask once before changing a core token (primary color, font) that affects every screen.

## Done

Tokens and core components defined → confirm via `AskUserQuestion` → `status: done` → Decision log → `WFCTL sync` → `/wf-wireframe`.
