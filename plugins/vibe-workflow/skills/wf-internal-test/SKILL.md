---
name: wf-internal-test
description: vibe-workflow 9단계(릴리즈). 바이브코더 외 내부 테스터에게 보낼 안내문과 피드백 양식을 만들고, 받은 피드백을 분류·수정한다. "내부 테스트", "테스터한테 보낼 안내", "피드백 정리", "팀원 테스트", "베타 피드백 받았어" 요청에 사용한다.
---

# wf-internal-test — 9. 내부 테스트 [릴리즈]

시작 전 `${CLAUDE_PLUGIN_ROOT}/reference/stage-rules.md` 를 Read 하고 공통 절차를 따름. 단계 키: `internal-test`.
테스터에게 직접 연락할 수 없음. 안내문을 만들어 사용자가 전달하고, 받은 피드백을 붙여넣게 함.

## 1. 안내문 만들기

1. `WFCTL new internal-test` — `09-internal-test.md`, `09-tester-guide.md` 생성.
2. `09-tester-guide.md` 작성: 무엇인지 한두 문장, 프리릴리즈 URL(`.workflow/08-prerelease.md`), 테스트 계정·기간, 해 볼 일.
   - 해 볼 일은 사용성 테스트(`.workflow/07-usability.md`) 과업 문구를 재사용. **목표만, 방법 없음.** 내부 링크·진행자 정보 넣지 않음
   - 테스터가 읽는 문서이므로 쉬운 말, 한 화면 이내
3. `AskUserQuestion` 으로 테스터 수·기간·피드백 받을 채널을 받아 테스터 표에 기록.
4. 안내문을 그대로 복사해 보낼 수 있다고 알려줌.

## 2. 피드백 처리

사용자가 피드백을 붙여넣으면:

1. 항목마다 I-xx 로 한 줄: 테스터·과업/화면·내용(요약)·분류(버그/사용성/요청)·심각도(차단/주요/경미).
2. 중복은 하나로 묶고 건수만 표시.
3. 처리 방침을 제안하고 `AskUserQuestion` 으로 확정: 수정 / 보류 / 거절. 차단은 수정이 기본.
4. 수정 후 재배포가 필요하면 `/wf-prerelease` 로 새 rc 버전 배포, 재배포 표에 반영 ID 기록.
5. 기능 요청은 공통 규약 `문서 관여 수준` 대로 — 이번 릴리즈에 넣을지 물음.

## 완료

차단 이슈 0건, 모든 항목의 처리 방침 확정 시 `AskUserQuestion` 확인 → `status: done` → `/wf-next` 의 문서 따라잡기 1회 → `WFCTL sync` → `/wf-release`.
