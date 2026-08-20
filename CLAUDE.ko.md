# CLAUDE.ko.md — 한국어판

이 문서는 [CLAUDE.md](CLAUDE.md) 의 한국어 번역이다. **정본은 영문판이다.**
Claude Code 가 자동으로 읽는 것은 `CLAUDE.md` 뿐이고, 이 파일은 사람이 읽기 위한 참조본이다.
규약을 바꿀 때는 영문판을 먼저 고치고 이 문서를 맞춘다.

## 이 저장소가 무엇인가

`vibe-workflow` Claude Code 플러그인의 소스다. 여기서 만드는 것은 **다른 프로젝트에 설치될 워크플로우 시스템**이다.
이 저장소 자체는 그 워크플로우의 적용 대상이 아니다 (`.workflow/` 가 없다).

## 명령

의존성도 빌드도 테스트 프레임워크도 없다. 순수 node 내장 모듈만 쓴다.

```bash
# JSON 매니페스트 검증 (깨지면 모든 설정이 조용히 무시되므로 필수)
node -e "JSON.parse(require('fs').readFileSync('.claude-plugin/marketplace.json','utf8'))"
node -e "JSON.parse(require('fs').readFileSync('plugins/vibe-workflow/.claude-plugin/plugin.json','utf8'))"
node -e "JSON.parse(require('fs').readFileSync('plugins/vibe-workflow/hooks/hooks.json','utf8'))"

# 훅 파이프 테스트 — 등록 전에 반드시 한다
H=plugins/vibe-workflow/hooks
echo '{"tool_name":"Edit","tool_input":{"file_path":"/절대/경로/src/a.ts"}}' | node $H/gate-write.js
echo '{}' | node $H/gate-stop.js
echo '{}' | node $H/inject-phase.js

# wfctl 수동 구동 (임시 디렉터리에서)
node plugins/vibe-workflow/scripts/wfctl.js init
node plugins/vibe-workflow/scripts/wfctl.js status

# 로컬 설치 테스트 (설치 없이 로드)
claude --plugin-dir "$(pwd)/plugins/vibe-workflow"

# 매니페스트가 실제로 로드되는지 검증 — JSON 문법 검사만으로는 못 잡는다
claude --plugin-dir "$(pwd)/plugins/vibe-workflow" plugin details vibe-workflow

# 실제 설치 (로컬 경로는 './' 형태여야 한다)
claude plugin marketplace add ./
claude plugin install vibe-workflow@vibe-workflow
claude plugin list          # Status 가 enabled 인지 확인. 로드 실패도 여기 뜬다
```

**`plugin.json` 에 `"hooks"` 필드를 넣지 마라.** `hooks/hooks.json` 은 자동으로 로드된다.
매니페스트에서 또 참조하면 `Duplicate hooks file detected` 로 플러그인 전체가 로드 실패한다.
`manifest.hooks` 는 표준 경로 **외의** 추가 훅 파일을 가리킬 때만 쓴다.
이 오류는 JSON 문법 검사로는 안 잡히고 `claude plugin list` 의 Status 에서만 드러난다.

훅을 고친 뒤에는 **파이프 테스트로 차단·허용 두 경로를 모두 확인한다.**
허용 경로에서 출력이 비어 있는지 반드시 본다 — 여기서 잘못 출력하면 정상 작업이 전부 막힌다.

## 아키텍처

### 상태 모델

단일 진실 원천은 대상 프로젝트의 `.workflow/state.json` 이고, 담는 것은 `phase` 와 `task` 뿐이다.

**게이트 통과 여부는 state.json에 저장하지 않는다.** 매번 산출물 파일에서 파생시킨다:

- 계획 승인 = `tasks/<id>/review.md` 의 `<!-- wf:review ... decision: approved -->` 마커
- 검증 통과 = `tasks/<id>/verify.md` 의 `<!-- wf:verify ... -->` 마커에서, config에 켜진 항목이 전부 `pass`

이 설계 때문에 상태와 실제가 어긋날 수 없다. 새 게이트를 추가할 때도 같은 원칙을 지킨다 — 판정 결과를 캐시하지 마라.

### 계층

```
hooks/lib/wf.js          모든 판정 로직의 단일 위치
   ↑ require
hooks/*.js               얇은 어댑터 (stdin 읽기 → wf.js 판정 → stdout)
scripts/wfctl.js         같은 wf.js 를 써서 사람/스킬이 상태를 바꾼다
```

**판정 로직은 반드시 `wf.js` 에 둔다.** 훅과 wfctl이 서로 다른 판단을 하면 이중 방어가 깨진다.
예: `wfctl phase build` 는 `reviewStatus()` 로 거부하고, `gate-write.js` 도 같은 `reviewStatus()` 로 차단한다.

### 훅 4종의 역할 분담

| 파일 | 이벤트 | 책임 |
| --- | --- | --- |
| `gate-write.js` | PreToolUse | 유일하게 `deny`/`ask` 를 내는 곳 |
| `mark-dirty.js` | PostToolUse | `dirty.txt` 에 수정 소스 축적 — Stop 게이트의 입력 |
| `inject-phase.js` | UserPromptSubmit | 단계별 규약 텍스트 (`RULES` 상수) |
| `gate-stop.js` | Stop | `dirty.txt` 비어있지 않음 + verify 미통과 → block |

`gate-write.js` 의 판정 순서에 의미가 있다. 승인 문서 `ask` 승격이 문서 경로 허용보다 **먼저** 와야 한다 — 순서를 바꾸면 `review.md` 가 `docGlobs` 의 `**/*.md` 에 걸려 그냥 통과한다.

### 훅 작성 규약

- **모든 경로에서 `exit 0`.** `wf.emit()` 을 쓰고, `main()` 을 `try/catch` 로 감싼다. 훅 오류가 작업을 막으면 사용자는 훅을 꺼버린다.
- **무간섭 = 무출력.** `wf.emit(null)`.
- **`jq` 를 쓰지 마라.** 이 환경에 없다. stdin JSON은 `wf.readStdin()` 으로 읽는다.
- **`hooks.json` 은 `args` 배열 형식.** 셸을 거치지 않아 공백 든 Windows 경로에서 안전하다.
- 차단 사유에는 **해법을 함께 적는다.** "금지됨"만으로는 모델이 헤맨다.
- `Stop` 훅에서 `decision: block` 을 쓸 때는 `stop_hook_active` 확인 + 횟수 상한 (`gate-stop.js` 의 `MAX_BLOCKS_PER_TASK`).

### 경로 처리

Windows 대상이므로 `wf.norm()` 으로 역슬래시→슬래시 + 소문자 정규화한 뒤 비교한다.
글롭 매처는 `wf.globToRe()` 자체 구현이다 (`**/`, `**`, `*`, `?` 지원). 의존성을 추가하지 마라.

### 시간 처리

저장값과 표시값을 섞지 마라.

- **저장·비교·만료 판정은 UTC ISO** (`new Date().toISOString()`).
  `state.json` 의 `updated`, `gate.log`, `override.json` 의 `until`·`at` 이 여기 해당한다.
- **사람이 읽는 날짜·시각은 로컬 시간대.** `wf.localDate()` / `wf.localStamp()` 를 쓴다.
  문서 템플릿의 `{{DATE}}`, 우회 만료 안내가 여기 해당한다.

`toISOString().slice(0, 10)` 을 사람이 볼 날짜에 쓰면 UTC 기준이라 하루 어긋난다.
KST 새벽 0~9시에 만든 문서에 전날 날짜가 박히는 버그가 실제로 있었다.

### 마커 형식

산출물 문서의 기계 판독용 블록은 HTML 주석이다. 사람이 읽는 문서 안에 있어도 렌더링에 방해되지 않는다.

```
<!-- wf:review
task: T-001
decision: approved
-->
```

`wf.readMarker(file, kind)` 로 파싱한다. 새 산출물을 추가하면 같은 형식을 쓴다.

## 코드 규약

### 크기 한계

넘으면 쪼갠다: 파일 300줄, 함수 50줄, 매개변수 5개, 함수당 분기 10개.

**예외는 `gate-write.js` 의 `main()` 하나다** (83줄 / 분기 19개).
이 함수는 판정 순서 자체가 규약이라, 헬퍼로 분해하면 순서가 호출부에서 보이지 않게 된다.
쪼개지 마라. 그리고 다른 곳에서 이 예외를 선례로 삼지 마라.

`wfctl.js` 는 343줄로 한계를 넘겼다. 명령을 더할 때는 파일 분리를 먼저 검토한다.

### 검증

**테스트 프레임워크를 도입하지 마라.** 무의존성이 이 플러그인의 제약이다.
새 코드는 파이프 테스트와 `wfctl` 수동 구동으로 검증한다 (`## 명령` 절).
훅을 고치면 차단 경로와 허용 경로를 **둘 다** 확인한다. 허용 경로의 무출력을 반드시 본다.

### 스타일

- 상수에 이름을 준다 (`MAX_BLOCKS_PER_TASK`, `PHASE_MSG`, `ORDER`). 판정에 리터럴을 직접 쓰지 마라.
- 가드절을 먼저 쓴다. 훅의 기본형은 "관심 없는 입력이면 즉시 `wf.emit(null)`" 이다.
- 부수효과(파일 쓰기, stdout)는 끝단에 모은다. `wf.js` 의 판정 함수는 입력만 보고 답하게 유지한다.
- 예외는 구체적으로 잡는다. 단 훅 최상위 `try/catch` 는 의도된 예외다 — 어떤 오류에서도 `exit 0` 이어야 한다.
- 이름은 의도를 드러낸다. 추상화는 같은 것이 세 번 나온 뒤에 한다.

## 스킬 작성 규약

- 스킬 본문에서 `wfctl` 은 `node "${CLAUDE_PLUGIN_ROOT}/scripts/wfctl.js"` 로 호출한다
- 스킬이 `state.json` 을 직접 편집하게 하지 마라 — 반드시 `wfctl` 을 거친다
- `frontmatter` 의 `description` 에 **사용자가 실제로 쓸 법한 한국어 표현**을 넣는다 (모델이 이걸로 스킬을 고른다)
- 사람의 판단이 필요한 지점은 `AskUserQuestion` 을 명시적으로 지시한다. "사용자에게 물어라"만으로는 건너뛴다

## 강제의 한계 (문서에 반드시 유지할 것)

훅은 파일 내용만 보고 **누가 썼는지 알 수 없다.** 따라서 "사람이 승인했다"는 사실 자체는 강제 불가다.
현재 구조의 대안은 승인 문서 쓰기를 `permissionDecision: "ask"` 로 승격시켜 실제 권한 프롬프트를 띄우는 것이다.
`bypassPermissions` / `dontAsk` 모드에서는 이마저 무력하다.

이 한계를 README에서 지우지 마라. 강제되지 않는 것을 강제된다고 적으면 시스템 전체의 신뢰가 무너진다.
