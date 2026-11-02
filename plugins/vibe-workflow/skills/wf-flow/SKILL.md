---
name: wf-flow
description: vibe-workflow 3단계(UX). 기능 명세를 바탕으로 UX 플로우차트를 mermaid 로 작성하고 화면 목록을 확정한다. "플로우차트", "유저 플로우", "화면 흐름", "UX 흐름 그려줘", "사용자 동선" 요청에 사용한다.
---

# wf-flow — 3. UX 플로우차트 [UX]

시작 전 `${CLAUDE_PLUGIN_ROOT}/reference/stage-rules.md` 를 Read 하고 공통 절차를 따름. 단계 키: `flow`.

## 입력

- 기능 명세(`.workflow/02-spec.md`) — 특히 핵심 기능과 Must 기능

## 진행

1. **화면 목록** — 기능을 수행하는 데 필요한 화면을 도출. slug(영소문자·숫자·`-`)와 관련 기능 링크. 4단계 파일명이 됨.
2. **전체 플로우** — mermaid `flowchart`. 진입점·주요 분기·목표 달성 지점. 노드 20개 이하, 넘으면 과업별로 쪼갬.
3. **핵심 과업별 경로** — 핵심 기능마다 시작 화면 → 경로 → 예외 분기 한 줄.
4. 점검: Must 기능 중 플로우에 안 나오는 것, 도달할 수 없는 화면, 막다른 화면. 발견하면 사용자에게 보여줌.
5. `AskUserQuestion` 으로 판단이 갈리는 분기(예: 로그인 시점, 온보딩 유무)를 확정.

## 완료

사용자 확인 후 `status: done` → 결정 로그 → `WFCTL sync` → `/wf-wireframe`.
