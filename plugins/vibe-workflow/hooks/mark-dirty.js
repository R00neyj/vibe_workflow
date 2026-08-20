'use strict'
// PostToolUse / Write|Edit|NotebookEdit
// build 단계에서 실제로 수정된 소스 파일을 기록한다.
// 이 기록이 있으면 "코드는 고쳤는데 검증은 안 했다" 를 Stop 훅이 판정할 수 있다.

const path = require('path')
const wf = require('./lib/wf.js')

function main() {
  const input = wf.readStdin()
  const file = wf.targetPath(input)
  if (!file) return wf.emit(null)

  const root = wf.findRoot(path.dirname(file)) || wf.findRoot(process.cwd())
  if (!root) return wf.emit(null)

  const rel = wf.toRel(root, file)
  if (!rel) return wf.emit(null)

  const cfg = wf.readConfig(root)
  if (wf.matchAny(rel, cfg.docGlobs)) return wf.emit(null)
  if (!wf.matchAny(rel, cfg.sourceGlobs)) return wf.emit(null)

  wf.markDirty(root, rel)
  return wf.emit(null)
}

try { main() } catch (e) { wf.emit(null) }
