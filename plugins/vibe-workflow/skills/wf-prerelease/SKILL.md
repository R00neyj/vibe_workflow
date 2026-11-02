---
name: wf-prerelease
description: vibe-workflow 8단계(릴리즈). 내부 테스트용 프리릴리즈를 배포하고 버전·URL 을 기록한다. "프리릴리즈", "스테이징 배포", "테스트 서버에 올려", "미리보기 배포", "베타 배포" 요청에 사용한다.
---

# wf-prerelease — 8. 프리릴리즈 배포 [릴리즈]

시작 전 `${CLAUDE_PLUGIN_ROOT}/reference/stage-rules.md` 를 Read 하고 공통 절차를 따름. 단계 키: `prerelease`.

## 진행

1. **배포 전 점검** — `WFCTL check` 전부 pass, 비밀값이 저장소에 없는지(`.env` 커밋 여부) 확인. 결과를 체크리스트에 표시.
2. **배포 대상** — `.workflow/config.json` 의 `deploy.prerelease` 가 비어 있으면 `AskUserQuestion` 으로 대상(Vercel/Netlify/GitHub Pages/자체 서버/기타)을 정하고 명령을 채움. 수동 배포를 원하면 비워 둠.
3. **배포** — 외부로 나가는 동작이므로 실행 직전 `AskUserQuestion` 으로 확인 후 `WFCTL deploy prerelease`. 수동이면 사용자에게 절차를 안내하고 결과 URL 을 받음.
4. **배포 후 확인** — URL 에 실제로 접속해 핵심 과업 하나를 수행. 안 되면 고치고 재배포.
5. **기록** — 버전(기본 `0.x.0-rc.N`)·일시·URL·방법. 마커 `version`·`url` 도 채움.

## 완료

접속 확인되면 `status: deployed` → 결정 로그 → `WFCTL sync` → `/wf-internal-test`.
