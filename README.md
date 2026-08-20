# vibe-workflow

바이브코딩을 `define → plan → review → build → verify` 상태머신으로 고정하는 Claude Code 플러그인.

각 단계는 **스킬**로 제공되고, 단계 전이 규약은 **결정론적 훅**으로 강제된다.

## 왜

일반적인 바이브코딩은 이렇게 흐른다.

```
"A 기능 필요해" → 에이전트 판단 → 자율 코딩 → 사람이 확인 → 버그 수정 → 수정 → ...
                                                          → 뒤늦은 대규모 리팩터링
```

문제는 **입력물이 없는 상태에서 구현이 먼저 시작된다는 것**이다.

PSD 퍼블리싱 같은 파이프라인이 잘 도는 이유는 단계가 4개라서가 아니라, **단계 사이에 양식이 고정된 산출물이 있기 때문**이다. 입력(PSD)과 출력(퍼블리싱)에 스키마가 있으니 각 단계는 "앞 산출물을 받아 다음 산출물을 낸다"로 환원되고, 에이전트의 자율 판단 여지가 스키마 폭만큼으로 좁아진다.

바이브코딩에는 그 산출물이 없다. 그래서 **만든다.** 문서를 잘 쓰자는 얘기가 아니라, 단계 전이의 **전제조건이 될 파일**을 정의하는 것이다. 파일이 없으면 다음 단계로 못 넘어가게 훅이 막는다.

## 구조

```
[Layer 0] 프로젝트 1회 — 정의
  define    requirements.md / architecture.md / backlog.yaml

[Layer 1] 기능 단위 반복
  plan      tasks/<id>/plan.md     변경 파일·인터페이스·수용 기준·검증 방법
  review    tasks/<id>/review.md   ← 게이트: 사람 승인 없으면 코딩 불가
  build     소스 코드 변경
  verify    tasks/<id>/verify.md   ← 게이트: 미통과면 턴 종료 불가
```

상태의 단일 진실 원천은 `.workflow/state.json`. 훅은 이 파일만 보고 판단한다.
게이트 통과 여부는 state.json에 저장하지 않고 **매번 산출물 파일에서 파생**시킨다 — 상태와 실제가 어긋나지 않게.

## 훅이 하는 일

| 이벤트 | 동작 |
| --- | --- |
| `PreToolUse` / Write·Edit | phase가 `build`가 아니거나 계획 미승인이면 소스 쓰기 **차단** |
| `PreToolUse` / review.md·verify.md | 승인 문서 쓰기를 **권한 프롬프트로 승격** — 사람이 직접 승인 |
| `PostToolUse` / Write·Edit | 수정된 소스를 기록 (검증 필요 신호) |
| `UserPromptSubmit` | 현재 단계의 규약만 컨텍스트에 주입 |
| `Stop` | 코드를 고쳐놓고 검증 안 했으면 턴 종료 **차단** |

`UserPromptSubmit` 주입이 핵심이다. 긴 CLAUDE.md는 길이에 비례해 누락되므로, **그 순간 필요한 규약만** 매 프롬프트마다 붙인다.

규약 강제는 전부 `command` 타입 훅(node 단일 파일)이다. `prompt`/`agent` 타입은 내부적으로 다시 LLM이라 누락 가능성이 남기 때문에 쓰지 않았다.

## 설치

**요구사항**: Node.js (내장 모듈만 사용, 의존성 없음)

세션 안에서:

```
/plugin marketplace add <저장소 URL 또는 로컬 경로>
/plugin install vibe-workflow@vibe-workflow
```

터미널에서:

```bash
# 저장소 루트에서. 로컬 경로는 './' 형태여야 한다 ('.' 만으로는 거부된다)
claude plugin marketplace add ./
claude plugin install vibe-workflow@vibe-workflow

claude plugin list                      # Status: enabled 확인
claude plugin details vibe-workflow     # 스킬 8 / 훅 4 확인
```

플러그인 코드를 고치는 중이라면 설치 없이:

```bash
claude --plugin-dir /경로/plugins/vibe-workflow
```

설치 후 스킬이나 훅이 안 잡히면 세션을 재시작한다 (`/hooks` 를 한 번 열어도 설정이 다시 읽힌다).

**user 스코프로 설치되면 훅이 모든 프로젝트에서 돈다.** 다만 `.workflow/state.json` 이 없는 디렉터리에서는 모든 훅이 아무것도 출력하지 않고 끝나므로 간섭이 없다. 워크플로우를 쓸 프로젝트에서만 `wfctl init` 을 하면 된다.

## 다른 머신에서 쓰기

전제: 이 저장소가 GitHub 에 올라가 있어야 한다.

### 방법 1 — 그 머신에 한 번 설치 (클론 불필요)

플러그인을 쓰기만 할 거라면 저장소를 클론할 필요가 없다.

```bash
claude plugin marketplace add R00neyj/vibe_workflow
claude plugin install vibe-workflow@vibe-workflow
claude plugin list        # Status: enabled 확인
```

`marketplace add` 는 `owner/repo`, `https://...`, `./path` 를 받는다.
한 번 설치하면 그 머신의 모든 프로젝트에서 스킬과 훅이 살아 있다.

### 방법 2 — 소비 프로젝트에 커밋 (팀 배포용, 권장)

워크플로우를 적용할 **프로젝트 쪽** `.claude/settings.json` 에 아래를 커밋한다.

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

그 프로젝트를 클론한 사람은 **별도 설치 없이** 플러그인을 받는다. 머신마다 수동 설치를 반복하지 않아도 되고, 프로젝트별로 켜고 끌 수 있다.
`ref` 에 태그를 박으면 버전이 고정된다 (`"ref": "v0.1.0"`).

플러그인을 개인적으로 끄고 싶으면 그 프로젝트의 `.claude/settings.local.json` 에 `{"enabledPlugins": {"vibe-workflow@vibe-workflow": false}}` 를 둔다 (local 이 project 를 덮는다).

### 방법 3 — 플러그인 자체를 개발/수정할 때

```bash
git clone https://github.com/R00neyj/vibe_workflow.git
cd vibe_workflow
claude --plugin-dir "$(pwd)/plugins/vibe-workflow"   # 설치 없이 로드
```

수정 후 반영하려면 커밋·푸시하고, 소비 쪽에서 `claude plugin update` 를 돌린다.

### 옮겨갈 때 알아야 할 것

| 항목 | 동작 |
| --- | --- |
| **Node.js** | 훅과 `wfctl` 이 node 스크립트다. 없는 머신에서는 훅이 전부 실패한다 (실패해도 작업은 막히지 않는다) |
| **첫 설치 시 신뢰 확인** | 마켓플레이스에서 플러그인을 설치하면 신뢰 경고가 뜬다. 정상이다 |
| **`.workflow/` 는 프로젝트를 따라간다** | 커밋 대상이므로 클론하면 요구사항·아키텍처·백로그·계획·승인 기록이 그대로 온다 |
| **런타임 파일은 안 따라간다** | `dirty.txt`, `gate.log`, `override.json`, `checks.json` 은 `.workflow/.gitignore` 로 제외된다. 새 머신에서는 비어 있는 상태로 시작하며, 이는 정상이다 |
| **`config.json` 의 명령** | `npm test` 같은 명령이 그 머신에서도 도는지 확인한다. 안 돌면 verify 가 통과할 수 없다 |

## 사용

```
/wf-init      프로젝트 정의 — 요구사항 문답, 아키텍처, 백로그, 검증 수단 확정
/wf-plan      task 하나의 계획 작성
/wf-review    계획 검토 + 사람 승인
/wf-build     승인 범위 안에서 구현
/wf-verify    자동 체크 실행 + 수용 기준 대조 + 사람 확인
/wf-status    현재 단계와 막힌 이유 확인
/wf-override  게이트 한시 해제 (긴급 상황용)
/wf-hook      새 훅 제작
```

전형적인 흐름:

```
/wf-init                     한 번
  ↓
/wf-plan → /wf-review → /wf-build → /wf-verify     기능마다 반복
```

## 상태 제어 CLI

스킬이 `state.json`을 직접 편집하지 않도록 제어 CLI를 둔다. 사람이 직접 써도 된다.

```bash
WF="node <플러그인>/scripts/wfctl.js"

$WF init                      # .workflow 생성 (package.json에서 체크 자동 감지)
$WF status                    # 단계·승인·검증·우회 상태
$WF task-new "로그인 API"     # 다음 task 생성 + plan 단계로 전이
$WF task-list                 # task 별 게이트 상태
$WF phase build --task T-001  # 단계 전이 (승인 없으면 스스로 거부)
$WF check                     # 설정된 자동 체크를 실제 실행, 종료코드로 판정
$WF override 30 "긴급 수정"   # 게이트 30분 해제
$WF override-clear
$WF doctor                    # 설치 점검
```

## 설정

`.workflow/config.json`:

```jsonc
{
  "checks": {
    "test":      { "enabled": true,  "command": "npm test --silent" },
    "build":     { "enabled": true,  "command": "npm run build --silent" },
    "lint":      { "enabled": false, "command": "" },
    "typecheck": { "enabled": true,  "command": "npx tsc --noEmit" }
  },
  "humanChecklist": true,          // 사람 확인 필수
  "agentReview": true,             // 에이전트 검증 리포트 필수
  "restrictToPlannedFiles": false, // true면 plan.md에 없는 파일 수정 차단
  "sourceGlobs": ["src/**"],       // 게이트 감시 대상
  "docGlobs": [".workflow/**", "docs/**", "**/*.md", ".claude/**"]
}
```

`checks` 중 `enabled: true` 이고 `command` 가 빈 문자열이 아닌 것만 verify 통과 조건이 된다.
`wfctl init` 이 `package.json` 스크립트와 `tsconfig.json`, pytest 설정을 보고 자동으로 채운다.

## 강제되는 것과 안 되는 것

솔직하게 구분한다.

**훅이 실제로 막는 것**

- 계획 없이 / 미승인 상태로 소스 코드 쓰기
- 계획에 없는 파일 수정 (`restrictToPlannedFiles: true` 일 때)
- 코드를 고쳐놓고 검증 없이 턴 끝내기
- 만료된 우회로 게이트 통과

**훅이 막을 수 없는 것**

- **"사람이 승인했는지"의 진위.** 훅은 파일 내용만 볼 수 있고 누가 썼는지는 알 수 없다.
  대신 승인 문서(`review.md` / `verify.md`) 쓰기를 **권한 프롬프트로 승격**시켜, 사람이 내용을 보고 도구 호출을 승인하게 만든다. 이것이 현재 구조에서 가능한 가장 강한 사람 게이트다.
  단, 세션이 `bypassPermissions` / `dontAsk` 모드면 이 프롬프트가 뜨지 않는다. 그 모드에서는 승인이 규약일 뿐 강제가 아니다.
- **verify 결과의 진실성.** `wfctl check` 는 실제 종료 코드로 판정하지만, `verify.md` 마커에 무엇을 적을지는 모델이 쓴다. 스킬과 주입 규약이 "실행하지 않은 항목에 pass 금지"를 반복해 강제하고, `checks.json` 에 실제 실행 결과가 남아 대조 가능하다.
- 사람 확인 체크리스트의 실제 수행 여부.

## 우회

막힌다고 우회부터 하면 시스템이 무의미해진다. 차단은 대개 계획이 부족하다는 신호다.
다만 프로덕션 장애 대응이나 탐색 단계에서 걸림돌이 되면 안 되므로 한시적 우회를 둔다.

```bash
$WF override 30 "결제 장애 핫픽스"
```

- 최대 480분, 만료되면 자동 무효
- 사유 필수
- 우회 중의 모든 쓰기가 `.workflow/gate.log` 에 기록됨

## 레이아웃

```
.claude-plugin/marketplace.json
plugins/vibe-workflow/
├── .claude-plugin/plugin.json
├── hooks/
│   ├── hooks.json              훅 등록
│   ├── lib/wf.js               공용 모듈 (상태·글롭·마커 파싱·게이트 판정)
│   ├── gate-write.js           PreToolUse  — 소스 쓰기 차단 / 승인 문서 ask 승격
│   ├── mark-dirty.js           PostToolUse — 수정 소스 기록
│   ├── inject-phase.js         UserPromptSubmit — 단계 규약 주입
│   └── gate-stop.js            Stop — 검증 미완료 시 턴 차단
├── scripts/wfctl.js            상태 제어 CLI
├── skills/wf-*/SKILL.md        8개 스킬
└── templates/                  산출물 템플릿 6종
```

프로젝트에 생성되는 것:

```
.workflow/
├── state.json          현재 단계·task (단일 진실 원천)
├── config.json         검증 수단·감시 경로
├── requirements.md     ← 파이프라인 입력물
├── architecture.md     불변조건·의존 방향
├── backlog.yaml        기능 분해
├── tasks/T-001/
│   ├── plan.md         계획
│   ├── review.md       승인 도장
│   ├── verify.md       검증 리포트
│   └── checks.json     자동 체크 실제 실행 결과
├── dirty.txt           수정된 소스 (gitignore)
├── gate.log            차단·우회 기록 (gitignore)
└── override.json       활성 우회 (gitignore)
```

`.workflow/` 는 커밋한다. 산출물이 곧 프로젝트 문서다. 런타임 파일만 `.workflow/.gitignore` 로 제외된다.

## 라이선스

MIT
