'use strict'
// vibe-workflow 훅 공용 모듈. 의존성 없음(node 내장만).
// 상태의 단일 진실 원천은 <project>/.workflow/ 이며, 게이트 통과 여부는
// state.json 에 저장하지 않고 매번 파일에서 파생시킨다(상태 드리프트 방지).

const fs = require('fs')
const path = require('path')

const WIN = process.platform === 'win32'

const PHASES = ['define', 'plan', 'review', 'build', 'verify', 'idle']

const DEFAULT_CONFIG = {
  // verify 단계 통과에 필요한 자동 체크. command 가 비면 해당 체크는 요구하지 않는다.
  checks: {
    test: { enabled: false, command: '' },
    build: { enabled: false, command: '' },
    lint: { enabled: false, command: '' },
    typecheck: { enabled: false, command: '' },
  },
  humanChecklist: true,          // 사람 확인 체크리스트 필수 여부
  agentReview: true,             // 에이전트 검증 리포트 필수 여부
  restrictToPlannedFiles: false, // true 면 plan.md 에 없는 파일 수정을 차단
  sourceGlobs: ['**'],           // 게이트가 감시할 경로
  docGlobs: [                    // 게이트가 항상 허용하는 경로
    '.workflow/**',
    'docs/**',
    '**/*.md',
    '.claude/**',
    '.gitignore',
  ],
}

// --- 경로 유틸 ----------------------------------------------------------

function norm(p) {
  const s = String(p || '').replace(/\\/g, '/')
  return WIN ? s.toLowerCase() : s
}

/** 프로젝트 루트(= .workflow/state.json 을 가진 디렉터리)를 위로 올라가며 찾는다. */
function findRoot(start) {
  let dir = path.resolve(start || process.cwd())
  for (;;) {
    if (fs.existsSync(path.join(dir, '.workflow', 'state.json'))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

function globToRe(glob) {
  const g = norm(glob)
  let re = ''
  for (let i = 0; i < g.length; i++) {
    const c = g[i]
    if (c === '*') {
      if (g[i + 1] === '*') {
        // '**/' 는 0개 이상의 디렉터리, '**' 는 나머지 전부
        if (g[i + 2] === '/') { re += '(?:.*/)?'; i += 2 } else { re += '.*'; i += 1 }
      } else {
        re += '[^/]*'
      }
    } else if (c === '?') {
      re += '[^/]'
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&')
    }
  }
  return new RegExp('^' + re + '$')
}

/** relPath 가 glob 목록 중 하나라도 만족하는가 */
function matchAny(relPath, globs) {
  const p = norm(relPath)
  return (globs || []).some(function (g) { return globToRe(g).test(p) })
}

/** 절대경로를 프로젝트 루트 기준 상대경로(슬래시)로. 루트 밖이면 null. */
function toRel(root, abs) {
  if (!abs) return null
  const rel = path.relative(root, path.resolve(abs))
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null
  return rel.replace(/\\/g, '/')
}

// --- 시간 표기 ----------------------------------------------------------
// 저장값(state.updated / gate.log / override.until)은 비교와 만료 계산에 쓰이므로
// UTC ISO 를 유지한다. 사람이 읽는 날짜·시각만 로컬 시간대로 표기한다.
// getFullYear/getDate/getHours 는 로컬 기준이라 DST 전환을 그대로 따른다.

function pad2(n) { return String(n).padStart(2, '0') }

/** 사람이 읽는 날짜(YYYY-MM-DD)를 로컬 시간대로. 문서의 작성일/검토일에 쓴다. */
function localDate(value) {
  const d = value === undefined ? new Date() : new Date(value)
  if (isNaN(d.getTime())) return String(value)
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
}

/** 사람이 읽는 시각(YYYY-MM-DD HH:MM)을 로컬 시간대로. 우회 만료 안내에 쓴다. */
function localStamp(value) {
  const d = value === undefined ? new Date() : new Date(value)
  if (isNaN(d.getTime())) return String(value)
  return localDate(d) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes())
}

// --- 상태 / 설정 --------------------------------------------------------

function wfDir(root) { return path.join(root, '.workflow') }

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch (e) { return fallback }
}

function readState(root) {
  const s = readJson(path.join(wfDir(root), 'state.json'), null)
  if (!s) return null
  return Object.assign({ version: 1, phase: 'idle', task: null }, s)
}

function writeState(root, next) {
  const cur = readState(root) || { version: 1 }
  const merged = Object.assign({}, cur, next, { updated: new Date().toISOString() })
  fs.mkdirSync(wfDir(root), { recursive: true })
  fs.writeFileSync(path.join(wfDir(root), 'state.json'), JSON.stringify(merged, null, 2) + '\n')
  return merged
}

function readConfig(root) {
  const c = readJson(path.join(wfDir(root), 'config.json'), {})
  return Object.assign({}, DEFAULT_CONFIG, c, {
    checks: Object.assign({}, DEFAULT_CONFIG.checks, c.checks || {}),
  })
}

function taskDir(root, task) { return path.join(wfDir(root), 'tasks', String(task || '')) }

// --- 마커 파싱 ----------------------------------------------------------
// 산출물 문서에 심는 기계 판독용 블록:
//   <!-- wf:review
//   task: T-003
//   decision: approved
//   -->
function readMarker(file, kind) {
  let text
  try { text = fs.readFileSync(file, 'utf8') } catch (e) { return null }
  const m = text.match(new RegExp('<!--\\s*wf:' + kind + '\\s*([\\s\\S]*?)-->'))
  if (!m) return null
  const out = {}
  const lines = m[1].split('\n')
  for (let i = 0; i < lines.length; i++) {
    const kv = lines[i].match(/^\s*([A-Za-z_][\w-]*)\s*:\s*(.*?)\s*$/)
    if (kv) out[kv[1]] = kv[2]
  }
  return out
}

// --- 게이트 판정 --------------------------------------------------------

/** 계획 승인 상태: 'approved' | 'rejected' | 'changes-requested' | 'missing' */
function reviewStatus(root, task) {
  if (!task) return 'missing'
  const mk = readMarker(path.join(taskDir(root, task), 'review.md'), 'review')
  if (!mk) return 'missing'
  if (mk.task && mk.task !== task) return 'missing'
  const d = (mk.decision || '').toLowerCase()
  if (d === 'approved') return 'approved'
  if (d === 'rejected') return 'rejected'
  return 'changes-requested'
}

/** 검증 통과 여부. 설정에서 켜진 항목만 요구한다. */
function verifyStatus(root, task) {
  const cfg = readConfig(root)
  const required = []
  const keys = Object.keys(cfg.checks)
  for (let i = 0; i < keys.length; i++) {
    const v = cfg.checks[keys[i]]
    if (v && v.enabled && String(v.command || '').trim()) required.push(keys[i])
  }
  if (cfg.humanChecklist) required.push('human')
  if (cfg.agentReview) required.push('agent')

  const mk = readMarker(path.join(taskDir(root, task), 'verify.md'), 'verify')
  if (!mk) {
    return { ok: false, required: required, missing: required, failed: [], reason: 'verify.md 가 없거나 wf:verify 마커가 없음' }
  }
  if (mk.task && task && mk.task !== task) {
    return { ok: false, required: required, missing: required, failed: [], reason: 'verify.md 의 task 가 현재 task 와 다름' }
  }
  const missing = []
  const failed = []
  for (let i = 0; i < required.length; i++) {
    const key = required[i]
    const v = (mk[key] || '').toLowerCase()
    if (!v) missing.push(key)
    else if (v !== 'pass') failed.push(key + '=' + v)
  }
  return { ok: missing.length === 0 && failed.length === 0, required: required, missing: missing, failed: failed, reason: '' }
}

/** 명시적 우회가 유효한가. .workflow/override.json 의 until 시각까지만 유효. */
function overrideActive(root) {
  const o = readJson(path.join(wfDir(root), 'override.json'), null)
  if (!o || !o.until) return null
  if (!(Date.parse(o.until) > Date.now())) return null
  return o
}

// --- 부수 기록 ----------------------------------------------------------

function log(root, event, detail) {
  try {
    fs.mkdirSync(wfDir(root), { recursive: true })
    fs.appendFileSync(
      path.join(wfDir(root), 'gate.log'),
      new Date().toISOString() + '\t' + event + '\t' + detail + '\n'
    )
  } catch (e) { /* 로깅 실패가 훅을 막아서는 안 된다 */ }
}

/** build 단계에서 실제로 손댄 소스 파일 기록(= verify 필요 신호) */
function markDirty(root, rel) {
  try {
    fs.mkdirSync(wfDir(root), { recursive: true })
    const file = path.join(wfDir(root), 'dirty.txt')
    const cur = fs.existsSync(file)
      ? fs.readFileSync(file, 'utf8').split('\n').filter(Boolean)
      : []
    if (cur.indexOf(rel) === -1) fs.appendFileSync(file, rel + '\n')
  } catch (e) { /* 무시 */ }
}

function readDirty(root) {
  try {
    return fs.readFileSync(path.join(wfDir(root), 'dirty.txt'), 'utf8').split('\n').filter(Boolean)
  } catch (e) { return [] }
}

function clearDirty(root) {
  try { fs.rmSync(path.join(wfDir(root), 'dirty.txt'), { force: true }) } catch (e) { /* 무시 */ }
}

// --- 훅 입출력 ----------------------------------------------------------

function readStdin() {
  let raw = ''
  try { raw = fs.readFileSync(0, 'utf8') } catch (e) { raw = '' }
  try { return JSON.parse(raw || '{}') } catch (e) { return {} }
}

/** 훅은 어떤 예외 상황에서도 exit 0 + 무해한 출력으로 끝나야 한다. */
function emit(obj) {
  if (obj) process.stdout.write(JSON.stringify(obj))
  process.exit(0)
}

/** 훅 입력에서 대상 파일 경로를 뽑는다(Write/Edit/NotebookEdit 공통). */
function targetPath(input) {
  const ti = (input && input.tool_input) || {}
  const tr = (input && input.tool_response) || {}
  return ti.file_path || ti.notebook_path || tr.filePath || null
}

module.exports = {
  PHASES: PHASES,
  DEFAULT_CONFIG: DEFAULT_CONFIG,
  findRoot: findRoot,
  toRel: toRel,
  matchAny: matchAny,
  norm: norm,
  localDate: localDate,
  localStamp: localStamp,
  wfDir: wfDir,
  readState: readState,
  writeState: writeState,
  readConfig: readConfig,
  taskDir: taskDir,
  readMarker: readMarker,
  reviewStatus: reviewStatus,
  verifyStatus: verifyStatus,
  overrideActive: overrideActive,
  log: log,
  markDirty: markDirty,
  readDirty: readDirty,
  clearDirty: clearDirty,
  readStdin: readStdin,
  emit: emit,
  targetPath: targetPath,
}
