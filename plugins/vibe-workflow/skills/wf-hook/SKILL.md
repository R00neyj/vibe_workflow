---
name: wf-hook
description: Claude Code 훅을 새로 만들거나 고친다. 지침으로는 지켜지지 않는 규약을 결정론적으로 강제할 때 사용한다. 작성-파이프테스트-등록-발화증명 절차를 따른다. "훅 만들어", "이 규칙 강제해", "매번 X 하게 해줘", "지침을 자꾸 어긴다" 요청에 사용한다.
---

# wf-hook — 훅 제작

## 먼저: 이게 훅으로 풀 문제인가

| 성격 | 수단 |
| --- | --- |
| 어떤 사건이 일어날 때마다 **반드시** 실행/차단 | **훅** |
| 판단이 필요하고 예외가 많음 | 스킬 또는 지침 |
| 항상 참인 배경 지식 | CLAUDE.md |
| 특정 도구·경로를 아예 금지 | `permissions.deny` (훅보다 단순) |

지침이 길어질수록 누락된다. **규약이 반드시 지켜져야 한다면 훅으로 옮긴다.**

## 설계 원칙

**결정론적으로 만든다.** 훅 타입은 `command`, `prompt`, `agent`, `http`, `mcp_tool` 이 있다.
`prompt`/`agent` 는 내부적으로 다시 LLM이라 누락 가능성이 남는다. **규약 강제는 `command` 로 한다.**
LLM 판단이 꼭 필요한 경우(코드 의미 판정 등)에만 `prompt`/`agent` 를 쓰고, 그때도 "차단"이 아니라 "경고"로 설계한다.

**훅은 절대 죽지 않아야 한다.** 훅 오류로 작업 전체가 막히면 사용자는 훅을 꺼버린다.
모든 경로에서 `exit 0` 으로 끝내고, 예외는 삼켜서 "허용"으로 처리한다.

**`jq` 를 쓰지 마라.** 이 환경에는 없다. node 단일 파일로 만든다 — 무의존이고 bash/PowerShell 양쪽에서 동일하게 동작한다.

## 이벤트와 출력

| 이벤트 | matcher | 할 수 있는 일 |
| --- | --- | --- |
| `PreToolUse` | 도구명 | 차단(`deny`) / 권한프롬프트(`ask`) / 허용 / 입력 수정 |
| `PostToolUse` | 도구명 | 기록, 포맷팅, 컨텍스트 주입 |
| `PostToolUseFailure` | 도구명 | 실패 대응 |
| `UserPromptSubmit` | - | 컨텍스트 주입 |
| `Stop` | - | 턴 종료 차단 |
| `SessionStart` | - | 초기 컨텍스트 주입 |
| `PreCompact` / `PostCompact` | manual/auto | 압축 전후 처리 |

입력은 **stdin 으로 JSON** 이 들어온다:

```json
{ "session_id": "...", "tool_name": "Edit",
  "tool_input": { "file_path": "...", "old_string": "..." },
  "tool_response": { "success": true } }
```

출력은 **stdout 으로 JSON**:

```jsonc
{
  "systemMessage": "사용자에게 보일 메시지",
  "decision": "block",          // PostToolUse / Stop / UserPromptSubmit
  "reason": "차단 사유",
  "continue": false,
  "suppressOutput": true,
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",        // allow | deny | ask
    "permissionDecisionReason": "사유",
    "additionalContext": "모델에 주입할 텍스트",  // UserPromptSubmit 등
    "updatedInput": { }                  // PreToolUse 만
  }
}
```

**출력이 없으면 = 간섭하지 않음.** 대부분의 호출에서 훅은 아무것도 출력하지 않아야 한다.

`Stop` 훅에서 `decision: block` 을 쓸 때는 **무한 루프를 막아라.** 입력의 `stop_hook_active` 가 true 면 즉시 통과시키고, 추가로 차단 횟수 상한을 둔다.

## 작성 절차

### 1. 뼈대

`${CLAUDE_PLUGIN_ROOT}/hooks/lib/wf.js` 를 재사용할 수 있으면 쓴다 (`readStdin`, `emit`, `findRoot`, `toRel`, `matchAny`, `targetPath`, `log`).

```js
'use strict'
const wf = require('./lib/wf.js')

function main() {
  const input = wf.readStdin()
  const file = wf.targetPath(input)
  if (!file) return wf.emit(null)          // 관심 없음 -> 무간섭

  // ... 판정 ...

  return wf.emit({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: '왜 막혔고 무엇을 하면 풀리는지'
    }
  })
}

try { main() } catch (e) { wf.emit(null) }   // 오류가 작업을 막지 않게
```

**차단 사유에는 반드시 해법을 적는다.** "금지됨"만 적힌 차단은 모델을 헤매게 만든다.

### 2. 파이프 테스트 (등록 전에 반드시)

실제 stdin 페이로드를 만들어 스크립트에 직접 물린다.

```bash
# Write|Edit 계열
echo '{"tool_name":"Edit","tool_input":{"file_path":"/실제/경로/a.ts"}}' | node hooks/내훅.js

# Bash 계열
echo '{"tool_name":"Bash","tool_input":{"command":"ls"}}' | node hooks/내훅.js

# Stop / UserPromptSubmit / SessionStart
echo '{}' | node hooks/내훅.js
```

**차단 케이스와 허용 케이스를 모두 확인한다.** 허용 케이스에서 출력이 비어 있는지 반드시 본다 — 여기서 잘못 출력하면 정상 작업이 막힌다.
경계 조건도 확인한다: 파일 경로 없음, 프로젝트 밖 경로, 설정 파일 없음, 깨진 JSON.

### 3. 등록

**플러그인이면** `hooks/hooks.json` 에 추가한다. 경로는 `${CLAUDE_PLUGIN_ROOT}` 기준으로 쓰고, `args` 배열 형식을 쓴다 — 셸을 거치지 않으므로 공백·따옴표가 든 Windows 경로에서도 안전하다.

```json
{
  "matcher": "Write|Edit",
  "hooks": [{
    "type": "command",
    "command": "node",
    "args": ["${CLAUDE_PLUGIN_ROOT}/hooks/내훅.js"],
    "timeout": 15,
    "statusMessage": "확인 중"
  }]
}
```

**프로젝트 단위면** `.claude/settings.json` 의 `hooks` 에 넣는다.
기존 배열을 **덮어쓰지 말고 병합한다.** 파일을 먼저 읽고 나서 고친다.

유용한 필드:
- `if`: 권한 규칙 문법으로 실행 조건을 좁힌다 (`"Bash(git *)"`) — 불필요한 프로세스 기동을 줄인다
- `async: true`: 결과를 기다리지 않는다 (기록용 훅에 적합)
- `once: true`: 한 번만 실행하고 제거
- `timeout`: 초 단위

### 4. 문법 검증

```bash
node -e "JSON.parse(require('fs').readFileSync('hooks/hooks.json','utf8'));console.log('OK')"
```

**설정 JSON이 깨지면 그 파일의 모든 설정이 조용히 무시된다.** 반드시 확인한다.

### 5. 발화 증명

등록만으로는 동작을 보장하지 못한다. 실제로 불리는지 확인한다.

명령 앞에 임시로 기록을 붙인다:

```
"command": "node", "args": ["-e", "require('fs').appendFileSync('C:/temp/hook-fired.txt', new Date().toISOString()+'\\n'); require('내훅.js')"]
```

또는 간단히 훅 스크립트 첫 줄에 `fs.appendFileSync` 를 한 줄 넣고, 해당 도구를 실제로 한 번 쓴 뒤 파일을 확인한다. **확인 후 반드시 제거한다.**

발화하지 않는데 파이프 테스트와 JSON 검증이 통과했다면, 설정 감시자가 아직 새 파일을 반영하지 못한 것이다.
→ 사용자에게 `/hooks` 를 한 번 열거나 세션을 재시작하라고 안내한다. (`/hooks` 는 사용자 UI라 대신 열어줄 수 없다.)

## 흔한 실패

| 증상 | 원인 |
| --- | --- |
| 정상 작업이 전부 막힘 | 허용 경로에서 실수로 `deny` 출력. 무간섭은 **무출력**이다 |
| 훅이 조용히 아무것도 안 함 | matcher 불일치, 또는 settings.json JSON 깨짐 |
| 턴이 끝나지 않음 | Stop 훅 무한 루프. `stop_hook_active` 미확인 |
| Windows에서만 실패 | 셸 인용 문제. `args` 배열 형식으로 바꾼다 |
| 경로 비교가 어긋남 | 역슬래시/대소문자. 정규화 후 비교한다 (`wf.norm`) |
| 훅 오류로 작업 중단 | `try/catch` 누락. 모든 경로에서 `exit 0` |

## 마무리

작업을 마치면 사용자에게 알린다: 무엇을 언제 막는지, 어떻게 우회하는지, `/hooks` 에서 확인·비활성화할 수 있다는 것.
훅은 성공해도 화면에 아무것도 남기지 않는다 — 조용한 성공은 설계된 동작이다.
