---
name: wf-review
description: vibe-workflow 의 review(계획 검토) 단계를 수행한다. plan.md 의 결함을 코딩 전에 찾아내고, 사람의 승인을 받아 review.md 에 판정을 기록한다. 승인 없이는 build 단계로 갈 수 없다. "계획 검토", "리뷰해줘", "이대로 진행해도 되나" 요청에 사용한다.
---

# wf-review — 계획 검토

**목적은 통과시키는 것이 아니라 결함을 찾는 것이다.** 여기서 잡은 문제 하나가 build 이후의 대규모 수정 하나를 없앤다.

`WFCTL` = `node "${CLAUDE_PLUGIN_ROOT}/scripts/wfctl.js"`

## 절대 규칙

- 이 단계에서 **소스 코드를 쓰지 않는다.**
- **승인 판정은 사람이 한다.** 반드시 `AskUserQuestion` 으로 판정을 받는다. 대신 결정하지 마라.
- review.md 쓰기는 권한 프롬프트로 올라간다. 이것이 사람 승인을 강제하는 실제 장치다.

## 절차

### 1. 대상 확인

```
WFCTL status
```

현재 task 의 `plan.md` 를 읽는다. 없으면 `/wf-plan` 을 먼저 하라고 안내하고 멈춘다.

### 2. 대조 자료 읽기

계획만 보고 검토하지 마라. 함께 읽는다:

- `.workflow/architecture.md` — 불변조건, 의존 방향
- `.workflow/requirements.md` — 범위 제외 항목
- plan.md 가 건드리겠다는 실제 파일들

### 3. 결함 찾기

여섯 항목을 각각 판정하고 **근거를 적는다.** "문제없음"만 적힌 검토는 검토가 아니다.

| 항목 | 무엇을 보는가 |
| --- | --- |
| 수용 기준이 검증 가능한가 | 관찰 가능한 서술인가. 검증 수단과 1:1 대응하는가 |
| 변경 범위가 최소인가 | 목적에 필요 없는 변경이 섞여 있지 않은가 |
| 아키텍처 불변조건을 지키는가 | 의존 방향 위반, 계층 건너뛰기 |
| 빠진 예외/실패 경로 | 입력 이상, 외부 호출 실패, 동시성, 빈 상태 |
| 더 작게 쪼갤 수 있는가 | 독립 검증 가능한 단위로 나뉘는가 |
| 이미 있는 코드로 되는가 | 중복 구현, 기존 유틸 미사용 |

특히 다음은 자주 빠지므로 명시적으로 확인한다:
**에러 처리**, **기존 호출부 영향**, **데이터 마이그레이션**, **되돌리는 방법**.

### 4. 사람에게 판정 요청

찾은 지적 사항을 정리해 보여준 뒤, `AskUserQuestion` 으로 묻는다:

- `approved` — 이대로 구현 진행
- `changes-requested` — plan.md 수정 후 재검토
- `rejected` — 이 task 자체를 접음

**자동으로 approved 를 고르지 마라.** 지적 사항이 하나도 없더라도 사람에게 묻는다.

### 5. 판정 기록

`.workflow/tasks/<task>/review.md` 를 템플릿 형식으로 쓴다.
`wf:review` 마커의 `decision` 에 사람이 고른 값을, `reviewer` 에 사람을 적는다.
이 쓰기는 권한 프롬프트로 올라간다 — 사용자가 승인해야 기록된다.

### 6. 단계 전이

- `approved` → `WFCTL phase build` 실행 후 `/wf-build` 안내
- `changes-requested` → `WFCTL phase plan` 실행 후 지적 사항을 반영해 plan.md 수정
- `rejected` → `WFCTL phase idle`, `backlog.yaml` 의 해당 항목 상태 갱신

`WFCTL phase build` 는 승인이 없으면 스스로 거부한다. 훅과 함께 이중으로 막힌다.
