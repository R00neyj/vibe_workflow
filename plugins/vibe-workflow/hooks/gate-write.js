'use strict'
// PreToolUse / Write|Edit|NotebookEdit
// 현재 phase 가 build 이고 계획이 승인된 상태가 아니면 소스 파일 쓰기를 차단한다.
// 승인 문서(review.md / verify.md)는 차단 대신 'ask' 로 올려 사람이 직접 승인하게 한다.

const path = require('path')
const wf = require('./lib/wf.js')

const ALLOW = null // 출력이 없으면 Claude Code 는 기존 권한 흐름을 그대로 진행한다

function deny(reason) {
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  }
}

function ask(reason) {
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'ask',
      permissionDecisionReason: reason,
    },
  }
}

const PHASE_MSG = {
  define: '지금은 define 단계다. 요구사항/아키텍처/백로그를 확정하는 중이며 소스 코드는 아직 쓸 수 없다. 정의가 끝났으면 /wf-plan 으로 진행하라.',
  plan: '지금은 plan 단계다. .workflow/tasks/<task>/plan.md 를 작성하는 중이며 소스 코드는 아직 쓸 수 없다. 계획을 다 썼으면 /wf-review 로 진행하라.',
  review: '지금은 review 단계다. 계획을 검토받는 중이며 소스 코드는 아직 쓸 수 없다. 승인되면 /wf-build 로 진행하라.',
  verify: '지금은 verify 단계다. 구현 결과를 검증하는 중이다. 검증 중 발견한 결함을 고쳐야 한다면 /wf-build 로 되돌아가라.',
  idle: '워크플로우가 시작되지 않았다(phase=idle). /wf-init 또는 /wf-plan 으로 작업을 시작하라.',
}

function main() {
  const input = wf.readStdin()
  const file = wf.targetPath(input)
  if (!file) return wf.emit(ALLOW)

  const root = wf.findRoot(path.dirname(file)) || wf.findRoot(process.cwd())
  if (!root) return wf.emit(ALLOW) // 워크플로우가 적용되지 않은 프로젝트

  const rel = wf.toRel(root, file)
  if (!rel) return wf.emit(ALLOW) // 프로젝트 밖 파일은 이 게이트의 관심사가 아니다

  const state = wf.readState(root) || { phase: 'idle', task: null }
  const cfg = wf.readConfig(root)

  // 1) 승인 문서는 사람의 실제 승인을 요구한다.
  //    훅은 "누가 썼는지"를 알 수 없으므로, 차단 대신 권한 프롬프트로 올려
  //    사람이 내용을 보고 직접 승인하도록 만든다.
  const isReviewDoc = /^\.workflow\/tasks\/[^/]+\/review\.md$/i.test(rel)
  const isVerifyDoc = /^\.workflow\/tasks\/[^/]+\/verify\.md$/i.test(rel)
  if (isReviewDoc || isVerifyDoc) {
    const kind = isReviewDoc ? '계획 승인서(review.md)' : '검증 리포트(verify.md)'
    return wf.emit(ask(
      kind + ' 를 기록하려 한다. 내용을 직접 확인하고 승인하라. ' +
      '이 문서가 다음 단계의 게이트를 여는 근거가 된다. 대상: ' + rel
    ))
  }

  // 2) 문서/설정 경로는 어느 단계에서든 허용
  if (wf.matchAny(rel, cfg.docGlobs)) return wf.emit(ALLOW)
  // 3) 감시 대상이 아니면 허용
  if (!wf.matchAny(rel, cfg.sourceGlobs)) return wf.emit(ALLOW)

  // 4) 명시적 우회
  const ov = wf.overrideActive(root)
  if (ov) {
    wf.log(root, 'OVERRIDE', rel + '\t' + (ov.reason || '(사유 없음)'))
    return wf.emit(ALLOW)
  }

  // 5) build 단계가 아니면 차단
  if (state.phase !== 'build') {
    wf.log(root, 'DENY', rel + '\tphase=' + state.phase)
    return wf.emit(deny(
      (PHASE_MSG[state.phase] || ('허용되지 않은 단계다(phase=' + state.phase + ').')) +
      '\n차단된 쓰기: ' + rel +
      '\n긴급히 우회해야 하면 /wf-override 를 사용하라.'
    ))
  }

  // 6) build 단계라도 계획 승인이 없으면 차단
  const rs = wf.reviewStatus(root, state.task)
  if (rs !== 'approved') {
    const detail = {
      missing: '아직 검토 결과가 없다',
      rejected: '계획이 반려되었다',
      'changes-requested': '계획에 수정 요청이 걸려 있다',
    }[rs] || rs
    wf.log(root, 'DENY', rel + '\treview=' + rs)
    return wf.emit(deny(
      'task ' + (state.task || '(미지정)') + ' 의 계획이 승인되지 않았다(' + detail + '). ' +
      '.workflow/tasks/' + state.task + '/review.md 의 decision 이 approved 여야 코드를 쓸 수 있다. ' +
      '/wf-review 를 실행하라.\n차단된 쓰기: ' + rel
    ))
  }

  // 7) 계획에 명시된 파일만 허용(옵션)
  if (cfg.restrictToPlannedFiles) {
    const mk = wf.readMarker(path.join(wf.taskDir(root, state.task), 'plan.md'), 'plan')
    const planned = ((mk && mk.files) || '').split(',').map(function (s) { return s.trim() }).filter(Boolean)
    if (planned.length && !wf.matchAny(rel, planned)) {
      wf.log(root, 'DENY', rel + '\tunplanned')
      return wf.emit(deny(
        rel + ' 은 승인된 계획의 변경 대상 목록에 없다. ' +
        '계획에 포함된 경로: ' + planned.join(', ') + '\n' +
        '범위를 넓혀야 하면 plan.md 를 고치고 /wf-review 로 재승인을 받아라.'
      ))
    }
  }

  return wf.emit(ALLOW)
}

try { main() } catch (e) { wf.emit(null) } // 훅 오류가 작업을 막지 않게 한다
