# {{PROJECT}} — Hardening & verification

{{NAV}}

Created: {{DATE}}

<!-- wf:hardening
status: draft
-->

> Source: [feature spec](02-spec.md) acceptance criteria and exceptions, [DESIGN.md](../DESIGN.md). Done when: every Must acceptance criterion is verified with evidence, no open `high` item, `wfctl check` passes → `status: done`

## At a glance

- 

## Acceptance criteria

| Feature | Criterion | How verified | Result |
| --- | --- | --- | --- |
| [F-01](02-spec.md#f-01) | | command / manual steps | pass / fail |

## Hardening checklist

| Area | Check | Result | Note |
| --- | --- | --- | --- |
| Errors | network/API failure shows a message, no blank screen | | |
| Edge cases | empty, very long, invalid input (from spec exceptions) | | |
| Loading | slow responses show loading states | | |
| Data | refresh/back keeps or restores state; no data loss | | |
| Security | no secrets in repo or client bundle; inputs validated server-side | | |
| Access | keyboard reachable, labels on inputs, contrast per DESIGN.md | | |
| Performance | first screen loads in an acceptable time on a mid device | | |
| Design | no raw colors/sizes outside tokens; components match DESIGN.md | | |
| Anti-slop | detection searches clean, or each hit is a DESIGN.md deliberate exception | | |

## Issues

| ID | Area | Problem | Severity | Fix |
| --- | --- | --- | --- | --- |
| H-01 | | | high / medium / low | |

## Checks

`wfctl check` summary:
