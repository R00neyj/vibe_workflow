# {{PROJECT}} — Design system

{{NAV}}

Created: {{DATE}}

<!-- wf:design
status: draft
-->

> The single source of truth for UI. Read it before any UI work or UI fix. Add a token or component here before using it.
> Source: visual direction in [UI references](.workflow/04-references.md).
> Done when: tokens and core components are defined and the user approved → `status: done`. It keeps changing after that; log every change.

## At a glance

- 

## Principles

-

## Tokens

Code uses these names, never raw values.

### Color

| Token | Value | Use |
| --- | --- | --- |
| color.bg | | page background |
| color.surface | | cards, sheets |
| color.text | | body text |
| color.text-muted | | secondary text |
| color.primary | | main action |
| color.on-primary | | text on primary |
| color.border | | dividers, inputs |
| color.danger | | errors, destructive |

### Typography

| Token | Size / line-height / weight | Use |
| --- | --- | --- |
| font.family | | |
| text.title | | screen titles |
| text.body | | body |
| text.caption | | labels, hints |

### Spacing · radius · shadow · motion

| Token | Value |
| --- | --- |
| space.1–6 | 4 / 8 / 12 / 16 / 24 / 32 px |
| radius.sm / md / lg | |
| shadow.card | |
| motion.fast / base | |
| breakpoint.md / lg | |

## Components

| Component | Purpose | Variants | States | Tokens | Screens |
| --- | --- | --- | --- | --- | --- |
| Button | actions | primary / secondary / ghost | default / hover / pressed / disabled / loading | color.primary, radius.md, text.body | |
| Input | text entry | | default / focus / error / disabled | color.border, color.danger | |

## Patterns

- Layout grid:
- Empty / loading / error states:
- Forms:

## Change log

| Date | Change | Why |
| --- | --- | --- |
| {{DATE}} | created | - |
