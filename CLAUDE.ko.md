# CLAUDE.md (한국어판)

이 문서는 이 저장소에서 작업하는 Claude Code(claude.ai/code)를 위한 안내다.

[CLAUDE.md](CLAUDE.md) 의 한국어 번역이다. **영문판이 원본이다** — 영문판을 먼저 고치고 이 문서에 반영한다.

## 이 저장소는 무엇인가

`vibe-workflow` Claude Code 플러그인의 소스다. 여기서 만드는 것은 **다른 프로젝트에 설치되는 워크플로우 시스템**이다.
이 저장소 자체는 그 워크플로우의 적용 대상이 아니다(`.workflow/` 가 없다).

워크플로우는 5개 큰 단계로 묶인 10단계다: Planning(1 기획서, 2 기능 명세) → UX(3 플로우) → UI(4 와이어프레임, 5 와이어프레임 검토) → Development(6 프로토타입, 7 사용성 테스트) → Release(8 프리릴리즈, 9 내부 테스트, 10 릴리즈).

**플러그인이 싣는 모든 것은 영어다**(스킬과 그 호출 문구, `stage-rules.md`, 템플릿, wfctl 출력, 패널, README). 한국어는 `CLAUDE.ko.md` 뿐이다. 이 상태를 유지한다.

## 명령

의존성, 빌드 단계, 테스트 프레임워크 없음. node 내장 모듈만 쓴다.

```bash
# JSON 매니페스트 검증 (깨진 매니페스트는 조용히 무시되므로 필수)
node -e "JSON.parse(require('fs').readFileSync('.claude-plugin/marketplace.json','utf8'))"
node -e "JSON.parse(require('fs').readFileSync('plugins/vibe-workflow/.claude-plugin/plugin.json','utf8'))"

# wfctl 수동 구동 (임시 디렉터리에서. 이 저장소에서 돌리지 않는다)
W=<저장소>/plugins/vibe-workflow/scripts/wfctl.js
node $W init && node $W new spec && node $W screen home "Home" && node $W status && node $W sync

# 진행 패널 mod: 검증·테스트·타입 체크 (tsconfig 는 plugin-authoring 타입 파일 머리말 참고)
claude plugin validate plugins/vibe-workflow
claude plugin test plugins/vibe-workflow

# 설치 없이 로드
claude --plugin-dir "$(pwd)/plugins/vibe-workflow"

# 매니페스트가 실제로 로드되는지 확인 — JSON 문법 검사로는 못 잡는다
claude --plugin-dir "$(pwd)/plugins/vibe-workflow" plugin details vibe-workflow

# 실제 설치 (로컬 경로는 './' 형태여야 한다)
claude plugin marketplace add ./
claude plugin install vibe-workflow@vibe-workflow
claude plugin list          # Status 가 enabled 인지 확인. 로드 실패도 여기 나온다
```

## 아키텍처

### 차단 훅 없음 — 읽기 전용 진행 패널 하나

0.2.0 부터 플러그인은 **command 훅을 싣지 않는다.** 차단형 훅이 사용을 답답하게 만들어 의도적으로 제거했다.
차단·ask·매 프롬프트 컨텍스트 주입 훅을 다시 넣지 않는다.

유일한 모듈은 진행 패널 mod 다(`hooks/hooks.json` → `{ "modules": ["./register.tsx"] }`, 0.3.0 에서 사용자 요청으로 추가):
- 데이터원은 `wfctl status --json` 하나뿐이다. 진행 판정을 스스로 하지 않으므로 패널·`wfctl status`·허브가 서로 다를 수 없다.
- 도킹 패널, 도킹 안 됐을 때의 상태줄, `/progress` 를 그린다. 프롬프트에 아무것도 주입하지 않고 아무것도 막지 않는다.
- `.workflow/config.json` 이 없는 프로젝트에서는 아무것도 하지 않는다.
- atom ref 는 문자열 리터럴이어야 한다(`{ plugin: 'vibe-workflow', key: ... }`) — 상수를 쓰면 validator 가 거부한다. 값의 필드가 바뀌면 atom 의 `shape` 태그를 바꾼다.
- `plugin.json` 에 `"hooks"` 필드를 넣지 않는다. `hooks/hooks.json` 은 자동으로 로드된다.

### 허브 + 위키 문서

대상 프로젝트에서 `.workflow/README.md` 가 허브다: 개요, 진행 표, 결정 로그, 열린 질문.
각 단계는 위키 페이지 하나(`01-brief.md` … `10-release.md`, `04-wireframe/*.html`)를 쓰고, 허브와 이웃 단계로 가는 네비 줄을 두며, ID 로 상호 링크한다(`[F-01](02-spec.md#f-01)`).
진행 표는 `<!-- wf:index:begin -->` 과 `<!-- wf:index:end -->` 사이에 있고 `wfctl sync` 가 다시 그린다. 허브의 나머지는 스킬이 쓴다.

### 상태 모델

**상태 파일이 없다.** 진행 상황은 매번 각 단계 문서의 마커에서 파생된다:

```
<!-- wf:spec
status: done
-->
```

`status` 가 `STAGES` 에 정의된 그 단계의 `done` 값(`done`, 또는 `approved` / `deployed` / `released`)과 같으면 완료다. 다음 단계는 첫 번째 미완료 단계다.
판정을 다른 곳에 캐시하지 않는다. 단계를 추가할 때도 같은 원칙을 지킨다.

### 계층

```
scripts/lib/wf.js        STAGES 표, 마커 파싱, 진행 판정, 허브 렌더링 — 순수, 입력만으로 답한다
scripts/wfctl.js         CLI: init / status [--json] / sync / new / screen / check / deploy / doctor — 파일 쓰기는 여기에만
hooks/register.tsx       진행 패널 mod (UI 전용), wfctl status --json 을 읽는다
types/index.d.ts         mod 의 $.state 계약
reference/stage-rules.md 모든 단계 스킬이 먼저 읽는 공통 규약
skills/wf-*/SKILL.md     단계마다 스킬 하나 + wf-init + wf-next(라우터) + wf-progress(보기 전용)
templates/               허브, 단계 문서, 와이어프레임 HTML/CSS
```

단계 정의는 `wf.js` 의 `STAGES` 에만 있다. 스킬·템플릿·README 는 이와 일치해야 한다(키, 파일명, 완료 값).

### 문서 관여 수준

문서는 방향을 잡는 도구이지 코드를 막는 관문이 아니다. 규칙은 `reference/stage-rules.md` 의 `Doc involvement level` 에 있다:
작은 변경은 문서를 건드리지 않고, 중간 변경은 먼저 구현한 뒤 한 줄로 반영하며, 큰 변경은 한 번만 묻고 어느 답이든 진행한다.
문서 정합성을 이유로 모델이 사용자 요청을 거절하거나 미루게 만드는 스킬 문구를 쓰지 않는다.

### 읽기 쉬운 문서

모든 단계 문서에는 3줄 이하의 `At a glance` 요약과 길이 예산(`stage-rules.md`)이 있다. 예산을 넘으면 하위 페이지로 쪼갠다.
템플릿은 짧게 유지한다. 템플릿에 절 하나를 더하면 모든 사용자에게 읽기 비용이 생긴다.

### 시간 처리

저장값과 표시값을 섞지 않는다.

- **저장·비교는 UTC ISO** (`new Date().toISOString()`).
- **사람이 읽는 날짜는 로컬 시간대.** `wf.localDate()` / `wf.localStamp()` 를 쓴다. 템플릿의 `{{DATE}}` 가 여기에 해당한다.

사람이 읽는 날짜에 `toISOString().slice(0, 10)` 을 쓰면 UTC 기준이라 KST 00:00~09:00 사이에는 하루 전 날짜가 된다.

### 마커 형식

기계 판독용 블록은 HTML 주석이라 Markdown·HTML 렌더링을 해치지 않는다. `wf.readMarker(file, kind)` 로 파싱한다.

## 코드 규칙

### 크기 제한

초과하면 분리한다: 파일당 300줄, 함수당 50줄, 매개변수 5개, 함수당 분기 10개. 예외 없음.

### 검증

**테스트 프레임워크를 도입하지 않는다.** 의존성 없음이 이 플러그인의 제약이다.
임시 디렉터리에서 `wfctl` 을 직접 돌려 검증한다: `init`, 바뀐 템플릿마다 `new`, `status`, `sync`, 오류 경로(없는 단계, 잘못된 slug, 빈 deploy).
템플릿을 고친 뒤에는 생성된 파일에 `{{...}}` 자리표시자가 모두 치환됐는지 확인한다.
패널이나 `status --json` 형태를 바꾼 뒤에는 `claude plugin validate`·`claude plugin test` 를 돌리고(mod 의 `*.test.tsx` 는 "테스트 프레임워크 금지"의 유일한 예외다: Claude Code 자체 키트로 돌고 의존성이 없다) `tsc` 로 타입 체크한다.

### 스타일

- 상수에 이름을 붙인다(`STAGES`, `HUB_FILE`, `CHECK_TIMEOUT_MS`). 판정에 리터럴을 직접 넣지 않는다.
- 가드 절을 먼저 쓴다.
- 부수 효과(파일 쓰기, stdout, 자식 프로세스)는 `wfctl.js` 에 둔다. `wf.js` 함수는 입력만으로 답한다(`.workflow/` 읽기는 예외).
- 주석은 한 줄 이하.
- 이름이 의도를 드러내게 한다. 같은 것이 세 번 나온 뒤에야 추상화한다.

## 스킬 작성 규칙

- `wfctl` 은 `node "${CLAUDE_PLUGIN_ROOT}/scripts/wfctl.js"` 로 호출한다
- 단계 스킬은 `${CLAUDE_PLUGIN_ROOT}/reference/stage-rules.md` 를 읽는 것으로 시작한다. 공통 규칙은 각 스킬에 복사하지 말고 거기에 둔다
- 스킬이 완료를 지어내지 않게 한다: 마커 `status` 는 사용자가 `AskUserQuestion` 으로 확인한 뒤에만 바꾼다
- frontmatter 의 `description` 에 **사용자가 실제로 입력할 영어 표현**을 넣는다(모델이 이걸로 스킬을 고른다)
- 사람 판단이 필요한 곳에는 `AskUserQuestion` 을 명시한다. "사용자에게 묻는다"만으로는 건너뛰어진다
- 스킬 본문은 짧게 — 60줄 안팎

## 강제의 한계 (문서에 남겨 둘 것)

아무것도 강제되지 않는다. 차단 훅이 없고(진행 패널은 표시만 한다), 단계 순서·사람 확인 지점·마커 갱신은 스킬이 지시하는 규약이다.
사람 확인 지점(와이어프레임 승인, 사용성 테스트 결과, 내부 테스트 처리 방침, 릴리즈 결정)은 모델이 `AskUserQuestion` 지시를 따르는 데 달려 있다.

이 한계를 README 에서 지우지 않는다. 강제되지 않는 것을 강제된다고 문서화하면 시스템 전체에 대한 신뢰가 무너진다.
