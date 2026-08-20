---
name: wf-status
description: vibe-workflow 의 현재 단계, task, 계획 승인 여부, 검증 상태, 게이트 우회 여부를 확인한다. "지금 어디까지 왔지", "상태 확인", "왜 막혔지" 요청에 사용한다.
---

# wf-status — 상태 확인

`WFCTL` = `node "${CLAUDE_PLUGIN_ROOT}/scripts/wfctl.js"`

## 절차

```
WFCTL status
WFCTL task-list
```

결과를 사용자에게 그대로 보여준 뒤, **무엇을 하면 되는지 한 줄로 안내한다.**

| 상태 | 다음 행동 |
| --- | --- |
| `.workflow` 없음 | `/wf-init` |
| phase=define | 요구사항/아키텍처/백로그 마저 채우기 (`/wf-init`) |
| phase=plan | plan.md 작성 (`/wf-plan`) |
| phase=review, 승인 대기 | `/wf-review` |
| phase=build, 승인됨 | 구현 (`/wf-build`) |
| phase=verify, 미충족 항목 있음 | `/wf-verify` |
| 우회 활성 | 작업이 끝났으면 `WFCTL override-clear` |

## 막힌 이유를 물어볼 때

`.workflow/gate.log` 를 읽는다. 차단(`DENY`), 우회(`OVERRIDE`), 턴 차단(`STOP-BLOCK`) 기록이 시각과 함께 남아 있다.

```
tail -30 .workflow/gate.log
```

설치 상태가 의심되면:

```
WFCTL doctor
```
