---
name: wf-prototype
description: vibe-workflow 6단계(개발). 승인된 와이어프레임과 기능 명세를 바탕으로 실제 동작하는 프로토타입을 만든다. 기술 스택·실행 방법·구현 범위를 06-prototype.md 에 기록한다. "프로토타입 만들자", "개발 시작", "구현해줘", "코딩 들어가자", "이제 만들어" 요청에 사용한다.
---

# wf-prototype — 6. 프로토타입 제작 [개발]

시작 전 `${CLAUDE_PLUGIN_ROOT}/reference/stage-rules.md` 를 Read 하고 공통 절차를 따름. 단계 키: `prototype`.
**문서 관여 수준 절을 특히 따름** — 이 단계부터는 구현 속도가 우선.

## 입력

- 기능 명세(`.workflow/02-spec.md`) — Must 기능, 수용 기준
- 와이어프레임(`.workflow/04-wireframe/index.html`) — 화면 구성과 이동
- 와이어프레임 검토(`.workflow/05-wireframe-review.md`) — 남은 메모

## 진행

1. **기술 선택** — 기획서 제약에서 정해지지 않았으면 2~3안을 `AskUserQuestion` 으로 제시(추천안 첫 번째). 기존 프로젝트면 기존 스택 유지.
2. **구현 순서** — 핵심 기능의 과업 경로부터. 한 경로가 끝까지 동작한 뒤 다음 경로.
3. **구현** — 와이어프레임의 배치·이동을 따름. 시각 디자인은 이 단계에서 최소한(읽을 수 있는 수준)으로.
4. **실행 확인** — 경로 하나가 끝날 때마다 앱을 실제로 띄워 확인. 실행 명령을 `.workflow/config.json` 의 `run` 에, 체크 명령을 `checks` 에 채움. `WFCTL check` 실행.
5. **기록** — `06-prototype.md` 에 기술 선택·실행 방법·구현 범위 표·와이어프레임과 달라진 점. 짧게.

## 진행 중 사용자 요청

사용자가 명세에 없는 기능이나 변경을 요청하면 공통 규약 `문서 관여 수준` 표대로 처리함. 중간 규모 이하는 묻지 않고 구현 후 한 줄 반영.

## 완료

Must 기능이 동작하고 `WFCTL check` 가 통과하면 사용자에게 시연 방법을 알리고 `AskUserQuestion` 으로 확인 → `status: done` → `WFCTL sync` → `/wf-usability`.
체크가 실패하면 고친 뒤 다시 실행. 실패한 채 완료하지 않음.
