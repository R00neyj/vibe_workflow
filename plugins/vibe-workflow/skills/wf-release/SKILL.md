---
name: wf-release
description: vibe-workflow 10단계(릴리즈). 릴리즈 판정 근거를 점검하고 릴리즈 노트를 쓴 뒤 정식 배포한다. "릴리즈", "정식 배포", "출시", "프로덕션 배포", "릴리즈 노트" 요청에 사용한다.
---

# wf-release — 10. 릴리즈 [릴리즈]

시작 전 `${CLAUDE_PLUGIN_ROOT}/reference/stage-rules.md` 를 Read 하고 공통 절차를 따름. 단계 키: `release`.
**릴리즈 결정은 사용자가 함.** 대신 결정하지 않음.

## 진행

1. **판정 근거 점검** — 템플릿 체크리스트를 문서에서 실제로 대조해 표시. 각 항목에 근거 문서 링크.
   - 성공 기준 → 기획서(`.workflow/01-brief.md`), Must 기능 → 기능 명세(`.workflow/02-spec.md`), 핵심 과업 → 사용성 테스트(`.workflow/07-usability.md`), 차단 이슈 → 내부 테스트(`.workflow/09-internal-test.md`)
   - `WFCTL check` 실제 실행
2. **보류 이슈** — 내부 테스트에서 보류한 항목을 표로.
3. **릴리즈 노트** — 사용자 관점 변경점 5줄 이하. 기능 추가 사이클이면 추가분만.
4. **판정** — 점검 결과를 보여주고 `AskUserQuestion`: "릴리즈 진행 / 보류". 미충족 항목이 있어도 사용자가 진행을 고르면 진행하고 결정 로그에 사유를 남김.
5. **배포** — `deploy.release` 가 있으면 실행 직전 한 번 더 확인 후 `WFCTL deploy release`. 없으면 수동 절차 안내.
6. **확인·기록** — URL 접속 확인, 버전·일시·URL·롤백 방법 기록. 마커 `version`·`url`. git 저장소면 태그(`v<버전>`) 제안 — 커밋·태그·푸시는 사용자 확인 후.

## 완료

`status: released` → 결정 로그 → `WFCTL sync`. 다음 기능은 `/wf-next` 의 기능 추가 사이클로 안내.
