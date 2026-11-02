# vibe-workflow

바이브코딩을 **기획 → UX → UI → 개발 → 릴리즈** 10단계로 진행하게 돕는 Claude Code 플러그인.
허브 문서 하나와 단계별 위키 문서를 만들면서 개발함. 훅 없음 — 전부 스킬.

## 흐름

| 큰 단계 | # | 단계 | 산출물 (`.workflow/`) | 스킬 |
| --- | --- | --- | --- | --- |
| 기획 | 1 | 사전조사·기획서 | `01-brief.md` | `/wf-brief` |
| 기획 | 2 | 기능 명세 | `02-spec.md` | `/wf-spec` |
| UX | 3 | UX 플로우차트 | `03-flow.md` (mermaid) | `/wf-flow` |
| UI | 4 | 저해상도 와이어프레임 | `04-wireframe/*.html` | `/wf-wireframe` |
| UI | 5 | 와이어프레임 검토 (사용자 승인) | `05-wireframe-review.md` | `/wf-wireframe-review` |
| 개발 | 6 | 프로토타입 제작 | 소스 코드 + `06-prototype.md` | `/wf-prototype` |
| 개발 | 7 | 사용성 테스트 (목표만 제시 → 막힌 곳 조사 → 수정) | `07-usability.md` | `/wf-usability` |
| 릴리즈 | 8 | 프리릴리즈 배포 | `08-prerelease.md` | `/wf-prerelease` |
| 릴리즈 | 9 | 내부 테스트 | `09-internal-test.md`, `09-tester-guide.md` | `/wf-internal-test` |
| 릴리즈 | 10 | 릴리즈 | `10-release.md` | `/wf-release` |

단계 이름을 외울 필요 없음. **"다음 단계"** 라고 말하면 `/wf-next` 가 현재 위치를 보고 이어감.

```
/wf-init    설치 — .workflow/ 와 허브 생성
/wf-next    진행 확인 → 다음 단계 실행. 기능 추가 사이클, 문서 따라잡기도 여기서
```

## 문서 구조 — 허브 + 위키

```
.workflow/
├── README.md          허브: 개요 · 진행 표 · 결정 로그 · 열린 질문
├── 01-brief.md        각 문서 상단에 ← 전체 흐름 · 이전 · 다음 네비
├── 02-spec.md         기능은 F-01 앵커, 다른 문서는 [F-01](02-spec.md#f-01) 로 링크
├── ...
└── config.json        체크·실행·배포 명령
```

- 허브 하나만 열면 전체 흐름과 현재 위치가 보임.
- 허브의 진행 표는 각 문서 마커(`<!-- wf:spec status: done -->`)에서 `wfctl sync` 가 다시 그림. 완료 여부를 따로 저장하지 않으므로 문서와 상태가 어긋나지 않음.
- 문서는 짧게: 문서마다 `한눈에` 3줄 요약, 표 위주, 길이 예산을 넘으면 하위 페이지로 분리.

## 문서와 코드의 관계

문서는 방향을 맞추는 도구이지 허가증이 아님. 변경 규모에 따라 관여 수준이 다름.

| 변경 규모 | 예 | 관여 |
| --- | --- | --- |
| 작음 | 문구, 스타일, 버그 | 문서 건드리지 않음 |
| 중간 | 기능·화면 추가 | 바로 구현, 끝난 뒤 문서에 한 줄 반영 |
| 큼 | 핵심 기능·대상 사용자·목표 변경 | 구현 전 한 번만 물음. 어느 답이든 진행 |

문서 정리는 단계 전환(7→8, 9→10) 때 `/wf-next` 의 "문서 따라잡기"로 몰아서 함.
세부 규약: [`plugins/vibe-workflow/reference/stage-rules.md`](plugins/vibe-workflow/reference/stage-rules.md)

## 강제되지 않는 것

v0.2.0 부터 훅이 없음. **아무것도 기계적으로 강제되지 않음.**

- 단계 순서는 규약임. 선행 단계가 미완료면 스킬이 묻지만 막지 않음.
- 사람 판단 지점(와이어프레임 승인, 사용성 테스트 결과, 내부 테스트 처리 방침, 릴리즈 결정)은 스킬이 `AskUserQuestion` 으로 묻도록 지시함. 모델이 이를 건너뛰는 것을 막는 장치는 없음.
- 문서 마커의 `status` 는 모델이 씀. 사용자 확인 후에만 바꾸도록 규약에 적혀 있을 뿐임.
- `wfctl check` 는 실제 종료 코드로 판정하지만, 그 결과를 문서에 옮기는 것은 모델임.

## 설치

**요구사항**: Node.js (내장 모듈만 사용)

```bash
claude plugin marketplace add R00neyj/vibe_workflow   # 또는 저장소 루트에서 ./
claude plugin install vibe-workflow@vibe-workflow
claude plugin list                                   # Status: enabled 확인
```

팀 배포는 소비 프로젝트의 `.claude/settings.json` 에 커밋:

```json
{
  "extraKnownMarketplaces": {
    "vibe-workflow": {
      "source": { "source": "github", "repo": "R00neyj/vibe_workflow", "ref": "main" }
    }
  },
  "enabledPlugins": { "vibe-workflow@vibe-workflow": true }
}
```

플러그인 개발 중에는 설치 없이 `claude --plugin-dir "$(pwd)/plugins/vibe-workflow"`.

### 0.1.x 에서 올라올 때

호환되지 않음. 0.1.x 의 `.workflow/`(state.json, tasks/)는 읽지 않음. 새로 `wfctl init` 후 필요한 내용을 새 문서로 옮김.

## wfctl

스킬이 쓰는 CLI. 사람이 직접 써도 됨.

```bash
WF="node <플러그인>/scripts/wfctl.js"
$WF init                     # .workflow/config.json + 허브 생성 (체크·실행 명령 자동 감지)
$WF status                   # 10단계 진행 상황과 다음 단계
$WF sync                     # 허브 진행 표 재생성
$WF new spec                 # 단계 문서 생성 (키 또는 번호: new 2)
$WF screen home "홈"         # 와이어프레임 화면 파일 생성
$WF check                    # config 의 체크 실행
$WF deploy prerelease        # config 의 배포 명령 실행
$WF doctor
```

## 설정

`.workflow/config.json`:

```jsonc
{
  "checks": {
    "test":      { "enabled": true,  "command": "npm run test --silent" },
    "build":     { "enabled": true,  "command": "npm run build --silent" },
    "lint":      { "enabled": false, "command": "" },
    "typecheck": { "enabled": true,  "command": "npx tsc --noEmit" }
  },
  "run": "npm run dev",
  "deploy": { "prerelease": "", "release": "" }
}
```

`deploy` 가 비어 있으면 스킬이 수동 배포를 안내하고 결과만 기록함.

## 레이아웃

```
.claude-plugin/marketplace.json
plugins/vibe-workflow/
├── .claude-plugin/plugin.json
├── reference/stage-rules.md    단계 스킬 공통 규약 (문서 구조·길이·관여 수준·링크)
├── scripts/wfctl.js            CLI
├── scripts/lib/wf.js           단계 정의·마커 파싱·진행 판정·허브 렌더링
├── skills/wf-*/SKILL.md        12개 스킬
└── templates/                  허브 + 단계 문서 + 와이어프레임 HTML
```

## 라이선스

MIT
