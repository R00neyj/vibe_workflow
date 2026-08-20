'use strict'
// UserPromptSubmit
// 현재 단계에서 지켜야 할 규약만 매 프롬프트마다 주입한다.
// CLAUDE.md 에 전체 규약을 몰아넣으면 길이에 비례해 누락되므로,
// "그 순간 필요한 규약"만 컨텍스트 맨 앞에 붙이는 방식을 쓴다.

const wf = require('./lib/wf.js')

const RULES = {
  define: [
    '# 현재 단계: define (정의)',
    '- 목표: requirements.md / architecture.md / backlog.yaml 을 확정한다.',
    '- 소스 코드 작성은 훅이 차단한다. 코딩하지 마라.',
    '- 요구사항이 모호하면 추측하지 말고 AskUserQuestion 으로 사람에게 물어라.',
    '- architecture.md 에는 모듈 경계, 의존 방향, 바뀌면 안 되는 불변조건을 적는다.',
    '- backlog.yaml 의 각 항목은 독립적으로 검증 가능한 크기여야 한다.',
    '- 정의가 끝나면 /wf-plan 으로 넘어간다.',
  ],
  plan: [
    '# 현재 단계: plan (계획 수립)',
    '- 목표: .workflow/tasks/<task>/plan.md 하나를 완성한다.',
    '- 소스 코드 작성은 훅이 차단한다.',
    '- plan.md 에는 반드시 포함: 변경할 파일 목록, 공개 인터페이스 시그니처,',
    '  영향 범위, 수용 기준(무엇이 참이면 완료인가), 검증 방법, 롤백 방법.',
    '- 수용 기준은 관찰 가능한 서술로 쓴다. "잘 동작한다" 같은 표현은 금지.',
    '- 기존 코드를 읽고 실제 파일 경로를 확인한 뒤에 쓴다. 경로를 지어내지 마라.',
    '- 계획을 다 쓰면 /wf-review 로 넘어간다.',
  ],
  review: [
    '# 현재 단계: review (계획 검토)',
    '- 목표: 계획의 결함을 코딩 전에 찾는다. 통과시키는 것이 목적이 아니다.',
    '- 소스 코드 작성은 훅이 차단한다.',
    '- 최소 점검 항목: 수용 기준이 검증 가능한가 / 변경 범위가 최소인가 /',
    '  기존 아키텍처 불변조건을 깨지 않는가 / 빠진 예외 경로가 있는가 /',
    '  더 작게 쪼갤 수 있는가 / 이미 있는 코드로 해결되는가.',
    '- 판정은 사람이 한다. review.md 쓰기는 권한 프롬프트로 올라가며,',
    '  사람이 승인하지 않으면 build 로 넘어갈 수 없다.',
  ],
  build: [
    '# 현재 단계: build (구현)',
    '- 승인된 plan.md 의 범위 안에서만 구현한다.',
    '- 계획에 없는 개선/리팩터링을 끼워 넣지 마라. 필요하면 백로그에 추가만 한다.',
    '- 계획과 실제가 어긋나면 코드를 바꾸지 말고 멈춘 뒤 계획 수정을 제안하라.',
    '- 구현이 끝나면 /wf-verify 로 넘어간다. 검증 없이 턴을 끝내면 훅이 막는다.',
  ],
  verify: [
    '# 현재 단계: verify (기능 검증)',
    '- 설정된 자동 체크를 실제로 실행하고, 그 출력에 근거해서만 pass 를 적는다.',
    '- 명령을 실행하지 않은 항목에 pass 를 적는 것은 금지다.',
    '- 실패하면 verify.md 에 fail 로 기록하고 /wf-build 로 되돌아간다.',
    '- 사람 체크리스트 항목은 사람이 확인해야 한다. 대신 통과시키지 마라.',
    '- verify.md 쓰기는 권한 프롬프트로 올라간다.',
  ],
  idle: [
    '# 현재 단계: idle',
    '- 워크플로우가 시작되지 않았다. 새 프로젝트면 /wf-init, 기존 프로젝트면 /wf-plan 으로 시작하라.',
  ],
}

function main() {
  const root = wf.findRoot(process.cwd())
  if (!root) return wf.emit(null)

  const state = wf.readState(root)
  if (!state) return wf.emit(null)

  const phase = state.phase || 'idle'
  const lines = (RULES[phase] || RULES.idle).slice()

  if (state.task) lines.splice(1, 0, '- 현재 task: ' + state.task)

  if (phase === 'build') {
    const rs = wf.reviewStatus(root, state.task)
    lines.push('- 계획 승인 상태: ' + rs + (rs === 'approved' ? '' : ' (코드 쓰기 차단 중)'))
  }
  if (phase === 'verify') {
    const vs = wf.verifyStatus(root, state.task)
    lines.push('- 필요한 검증 항목: ' + (vs.required.join(', ') || '(없음)'))
    if (!vs.ok) lines.push('- 아직 미충족: ' + [].concat(vs.missing, vs.failed).join(', '))
  }

  const ov = wf.overrideActive(root)
  if (ov) lines.push('- [경고] 게이트 우회가 활성 상태다(' + ov.until + '). 사유: ' + (ov.reason || '미기재'))

  return wf.emit({
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: lines.join('\n'),
    },
  })
}

try { main() } catch (e) { wf.emit(null) }
