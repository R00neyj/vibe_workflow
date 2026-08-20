'use strict'
// Stop
// 소스를 고쳐놓고 검증하지 않은 채로 턴을 끝내는 것을 막는다.
// 무한 루프 방지 장치를 두 겹 둔다: stop_hook_active 플래그, 그리고 task 당 재차단 횟수 상한.

const fs = require('fs')
const path = require('path')
const wf = require('./lib/wf.js')

const MAX_BLOCKS_PER_TASK = 3

function counterFile(root) { return path.join(wf.wfDir(root), 'stopguard.json') }

function bump(root, task) {
  let data = {}
  try { data = JSON.parse(fs.readFileSync(counterFile(root), 'utf8')) } catch (e) { data = {} }
  const key = String(task || '-')
  data[key] = (data[key] || 0) + 1
  try {
    fs.mkdirSync(wf.wfDir(root), { recursive: true })
    fs.writeFileSync(counterFile(root), JSON.stringify(data))
  } catch (e) { /* 무시 */ }
  return data[key]
}

function main() {
  const input = wf.readStdin()
  if (input && input.stop_hook_active) return wf.emit(null) // 이미 한 번 막았다

  const root = wf.findRoot(process.cwd())
  if (!root) return wf.emit(null)

  const state = wf.readState(root)
  if (!state) return wf.emit(null)
  if (state.phase !== 'build' && state.phase !== 'verify') return wf.emit(null)

  if (wf.overrideActive(root)) return wf.emit(null)

  const dirty = wf.readDirty(root)
  if (dirty.length === 0) return wf.emit(null) // 손댄 코드가 없으면 검증할 것도 없다

  const vs = wf.verifyStatus(root, state.task)
  if (vs.ok) return wf.emit(null)

  const n = bump(root, state.task)
  if (n > MAX_BLOCKS_PER_TASK) {
    return wf.emit({
      systemMessage:
        '[vibe-workflow] 검증이 여전히 미완료지만 재차단 상한(' + MAX_BLOCKS_PER_TASK + '회)에 도달해 통과시킨다. ' +
        '미충족 항목: ' + [].concat(vs.missing, vs.failed).join(', '),
    })
  }

  const detail = vs.reason
    ? vs.reason
    : '미충족 항목: ' + [].concat(vs.missing, vs.failed).join(', ')

  wf.log(root, 'STOP-BLOCK', (state.task || '-') + '\t' + detail)

  return wf.emit({
    decision: 'block',
    reason:
      '소스 ' + dirty.length + '개 파일을 수정했지만 검증이 끝나지 않았다.\n' +
      '수정된 파일: ' + dirty.slice(0, 10).join(', ') + (dirty.length > 10 ? ' 외 ' + (dirty.length - 10) + '개' : '') + '\n' +
      detail + '\n' +
      '지금 해야 할 일: 설정된 검증 명령을 실제로 실행하고, 그 결과를 ' +
      '.workflow/tasks/' + (state.task || '<task>') + '/verify.md 의 wf:verify 마커에 기록하라. ' +
      '실패한 항목이 있으면 고친 뒤 다시 검증하라. (/wf-verify)',
  })
}

try { main() } catch (e) { wf.emit(null) }
