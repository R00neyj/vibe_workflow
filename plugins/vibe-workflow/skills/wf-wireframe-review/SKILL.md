---
name: wf-wireframe-review
description: vibe-workflow 5단계(UI). 사용자가 와이어프레임을 검토하고 승인한다. 지적을 받아 와이어프레임을 고치고 라운드를 기록한다. "와이어프레임 검토", "화면 리뷰", "와이어프레임 확인했어", "이 화면 수정", "와이어프레임 승인" 요청에 사용한다.
---

# wf-wireframe-review — 5. 와이어프레임 검토 [UI]

시작 전 `${CLAUDE_PLUGIN_ROOT}/reference/stage-rules.md` 를 Read 하고 공통 절차를 따름. 단계 키: `wireframe-review`.

## 판정은 사용자만 함

승인을 대신 내리지 않음. 지적이 없어 보여도 반드시 `AskUserQuestion` 으로 물음.

## 진행

1. 검토 안내: `04-wireframe/index.html` 을 열어 핵심 과업 경로를 클릭으로 따라가 보라고 함. 볼 것 3가지만 제시 — 빠진 화면/요소, 순서가 어색한 곳, 불필요한 것.
2. 사용자 지적을 받아 라운드 표에 화면별 한 줄씩 기록.
3. 와이어프레임을 고침. 플로우가 바뀌면 `03-flow.md` 도 한 줄 반영.
4. `AskUserQuestion`: "승인 / 수정 후 다시 검토 / 플로우부터 다시".
   - 수정 → 새 라운드. 라운드가 3회를 넘으면 쟁점을 정리해 플로우 재검토를 제안
   - 플로우부터 → `03-flow.md` status 를 `draft` 로, `/wf-flow`

## 완료

승인 시 `status: approved`, `reviewer` 에 사용자 기입 → 결정 로그 → `WFCTL sync` → `/wf-prototype`.
