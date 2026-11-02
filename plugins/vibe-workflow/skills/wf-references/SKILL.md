---
name: wf-references
description: vibe-workflow stage 4 (UI, full mode). Collect screen-level UI references before drawing wireframes — layouts, components, interactions and a visual direction — per screen in the UX flow. Use when the user says "find UI references", "design references", "show me examples of this screen", "what do similar apps look like", "moodboard", "UI inspiration".
---

# wf-references — 4. UI references [UI]

Before starting, Read `${CLAUDE_PLUGIN_ROOT}/reference/stage-rules.md` and follow the common procedure. Stage key: `references`.

The brief's reference research compares services. This stage is screen-level: how others lay out, compose and animate the same kind of screen.

## Input

- UX flow (`.workflow/03-flow.md`) — screen list and core task paths
- Feature spec (`.workflow/02-spec.md`) — what each screen must hold
- Brief (`.workflow/01-brief.md`) — target users, reference services, constraints

## Steps

Also Read `${CLAUDE_PLUGIN_ROOT}/reference/ui-anti-slop.md`. References that are themselves slop (purple gradients, glass cards, icon-tile feature rows) do not count; say why when you drop one.

1. **Ask first** — `AskUserQuestion`: references the user already has (links, screenshots, apps they like) and the platform (mobile web / desktop web / native app).
2. **Search per screen** — core screens first. 1–3 references each from real products and galleries (e.g. Mobbin, Page Flows, Dribbble, Behance, the reference services in the brief). Use web search; if a browser tool is available, capture the screen into `.workflow/04-references/<slug>-<n>.png`. Without tools, ask the user for links or captures.
3. **Record** — one row per reference: service · screen, link or capture, **what to borrow** (one line), type (layout / component / interaction / visual). No reference without a "borrow" line.
4. **Visual direction** — propose 2–3 directions with mood keywords and one example each. The user picks via `AskUserQuestion`. This feeds the prototype; the wireframe stays low-fi.
5. **Patterns** — list patterns that recur across references and that the wireframe should adopt; list what to avoid.
6. Keep it short: references are links and one-liners, not essays.

## Done

When every core screen has a reference and a direction is picked, confirm via `AskUserQuestion` → `status: done` → Decision log (picked direction) → `WFCTL sync` → `/wf-design`.
The user may skip this stage; record that in the Decision log and continue.
