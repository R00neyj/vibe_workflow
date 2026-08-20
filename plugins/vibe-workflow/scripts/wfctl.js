#!/usr/bin/env node
'use strict'
// wfctl - vibe-workflow 상태 제어 CLI
// 스킬이 state.json 을 손으로 편집하지 않게 하려고 둔다.
// 단계 전이 규칙을 여기서 한 번 더 검사하므로 훅과 함께 이중 방어가 된다.
//
// 사용: node wfctl.js <command> [args]

const fs = require('fs')
const path = require('path')
const cp = require('child_process')
const wf = require('../hooks/lib/wf.js')

const VERSION = '0.1.0'
const ORDER = ['define', 'plan', 'review', 'build', 'verify']

function die(msg, code) {
  process.stderr.write(msg + '\n')
  process.exit(code === undefined ? 1 : code)
}

function root(required) {
  const r = wf.findRoot(process.cwd())
  if (!r && required !== false) {
    die('이 디렉터리에서 .workflow/state.json 을 찾지 못했다. 먼저 `wfctl init` 을 실행하라.')
  }
  return r
}

function templateDir() { return path.join(__dirname, '..', 'templates') }

function copyTemplate(name, dest, vars) {
  let text = fs.readFileSync(path.join(templateDir(), name), 'utf8')
  const keys = Object.keys(vars || {})
  for (let i = 0; i < keys.length; i++) {
    text = text.split('{{' + keys[i] + '}}').join(vars[keys[i]])
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, text)
}

// --- init ---------------------------------------------------------------

function detectChecks(dir) {
  const checks = {
    test: { enabled: false, command: '' },
    build: { enabled: false, command: '' },
    lint: { enabled: false, command: '' },
    typecheck: { enabled: false, command: '' },
  }
  let pkg = null
  try { pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')) } catch (e) { pkg = null }
  if (pkg && pkg.scripts) {
    const s = pkg.scripts
    if (s.test) { checks.test = { enabled: true, command: 'npm test --silent' } }
    if (s.build) { checks.build = { enabled: true, command: 'npm run build --silent' } }
    if (s.lint) { checks.lint = { enabled: true, command: 'npm run lint --silent' } }
    if (s.typecheck) { checks.typecheck = { enabled: true, command: 'npm run typecheck --silent' } }
  }
  if (!checks.typecheck.enabled && fs.existsSync(path.join(dir, 'tsconfig.json'))) {
    checks.typecheck = { enabled: true, command: 'npx tsc --noEmit' }
  }
  if (!checks.test.enabled) {
    const py = ['pytest.ini', 'pyproject.toml', 'tox.ini'].some(function (f) {
      return fs.existsSync(path.join(dir, f))
    })
    if (py && fs.existsSync(path.join(dir, 'tests'))) {
      checks.test = { enabled: true, command: 'python -m pytest -q' }
    }
  }
  return checks
}

function cmdInit(args) {
  const dir = process.cwd()
  const wfd = path.join(dir, '.workflow')
  const force = args.indexOf('--force') !== -1

  if (fs.existsSync(path.join(wfd, 'state.json')) && !force) {
    die('.workflow 가 이미 있다. 덮어쓰려면 --force 를 붙여라.')
  }

  fs.mkdirSync(path.join(wfd, 'tasks'), { recursive: true })

  const cfg = Object.assign({}, wf.DEFAULT_CONFIG, { checks: detectChecks(dir) })
  fs.writeFileSync(path.join(wfd, 'config.json'), JSON.stringify(cfg, null, 2) + '\n')
  fs.writeFileSync(
    path.join(wfd, 'state.json'),
    JSON.stringify({ version: 1, phase: 'define', task: null, updated: new Date().toISOString() }, null, 2) + '\n'
  )
  fs.writeFileSync(
    path.join(wfd, '.gitignore'),
    ['dirty.txt', 'gate.log', 'stopguard.json', 'override.json', 'tasks/*/checks.json', ''].join('\n')
  )

  const stamp = wf.localDate()
  for (const t of [
    ['requirements.md', 'requirements.md'],
    ['architecture.md', 'architecture.md'],
    ['backlog.yaml', 'backlog.yaml'],
  ]) {
    const dest = path.join(wfd, t[1])
    if (!fs.existsSync(dest)) copyTemplate(t[0], dest, { DATE: stamp, PROJECT: path.basename(dir) })
  }

  console.log('.workflow 생성 완료 (phase=define)')
  const enabled = Object.keys(cfg.checks).filter(function (k) { return cfg.checks[k].enabled })
  console.log('감지된 자동 체크: ' + (enabled.length ? enabled.join(', ') : '없음 - config.json 에 직접 채워라'))
}

// --- status -------------------------------------------------------------

function cmdStatus() {
  const r = root()
  const st = wf.readState(r)
  const cfg = wf.readConfig(r)
  const rs = st.task ? wf.reviewStatus(r, st.task) : '-'
  const vs = st.task ? wf.verifyStatus(r, st.task) : null
  const dirty = wf.readDirty(r)
  const ov = wf.overrideActive(r)

  console.log('프로젝트   : ' + r)
  console.log('단계       : ' + st.phase)
  console.log('현재 task  : ' + (st.task || '(없음)'))
  console.log('계획 승인  : ' + rs)
  console.log('검증       : ' + (vs ? (vs.ok ? 'ok' : '미완료 [' + [].concat(vs.missing, vs.failed).join(', ') + ']') : '-'))
  console.log('수정된 소스: ' + dirty.length + '개' + (dirty.length ? ' (' + dirty.slice(0, 5).join(', ') + ')' : ''))
  console.log('게이트 우회: ' + (ov ? '활성 ~' + wf.localStamp(ov.until) + ' / ' + (ov.reason || '') : '없음'))
  const enabled = Object.keys(cfg.checks).filter(function (k) { return cfg.checks[k].enabled })
  console.log('자동 체크  : ' + (enabled.length ? enabled.join(', ') : '없음'))
}

// --- phase --------------------------------------------------------------

function cmdPhase(args) {
  const r = root()
  const target = args[0]
  if (ORDER.indexOf(target) === -1 && target !== 'idle') {
    die('단계는 ' + ORDER.join(' | ') + ' | idle 중 하나여야 한다.')
  }
  const st = wf.readState(r)
  let task = st.task
  const ti = args.indexOf('--task')
  if (ti !== -1 && args[ti + 1]) task = args[ti + 1]

  if (target === 'build') {
    if (!task) die('build 로 가려면 --task 로 대상 task 를 지정해야 한다.')
    const rs = wf.reviewStatus(r, task)
    if (rs !== 'approved') {
      die('계획이 승인되지 않아 build 로 갈 수 없다 (review=' + rs + ').\n' +
          '.workflow/tasks/' + task + '/review.md 의 decision 을 approved 로 만들어야 한다.')
    }
  }
  if (target === 'review' && task) {
    if (!fs.existsSync(path.join(wf.taskDir(r, task), 'plan.md'))) {
      die('plan.md 가 없어 review 로 갈 수 없다: .workflow/tasks/' + task + '/plan.md')
    }
  }

  const next = wf.writeState(r, { phase: target, task: task })
  if (target === 'plan' || target === 'define' || target === 'idle') wf.clearDirty(r)
  try { fs.rmSync(path.join(wf.wfDir(r), 'stopguard.json'), { force: true }) } catch (e) { /* 무시 */ }
  console.log('단계 전이: ' + st.phase + ' -> ' + next.phase + (task ? ' (task=' + task + ')' : ''))
}

// --- task ---------------------------------------------------------------

function nextTaskId(r) {
  const dir = path.join(wf.wfDir(r), 'tasks')
  let max = 0
  try {
    for (const name of fs.readdirSync(dir)) {
      const m = name.match(/^T-(\d+)$/)
      if (m) max = Math.max(max, parseInt(m[1], 10))
    }
  } catch (e) { /* 디렉터리 없음 */ }
  return 'T-' + String(max + 1).padStart(3, '0')
}

function cmdTaskNew(args) {
  const r = root()
  const title = args.join(' ').trim()
  if (!title) die('사용법: wfctl task-new "<작업 제목>"')
  const id = nextTaskId(r)
  const dest = path.join(wf.taskDir(r, id), 'plan.md')
  copyTemplate('plan.md', dest, { TASK: id, TITLE: title, DATE: wf.localDate() })
  wf.writeState(r, { phase: 'plan', task: id })
  wf.clearDirty(r)
  console.log('task 생성: ' + id + ' — ' + title)
  console.log('계획 파일: .workflow/tasks/' + id + '/plan.md')
  console.log('단계를 plan 으로 전이했다.')
}

function cmdTaskList() {
  const r = root()
  const dir = path.join(wf.wfDir(r), 'tasks')
  let names = []
  try { names = fs.readdirSync(dir).filter(function (n) { return /^T-\d+$/.test(n) }).sort() } catch (e) { names = [] }
  if (!names.length) return console.log('task 가 없다.')
  const st = wf.readState(r)
  for (const id of names) {
    const mk = wf.readMarker(path.join(dir, id, 'plan.md'), 'plan') || {}
    const vs = wf.verifyStatus(r, id)
    console.log(
      (id === st.task ? '* ' : '  ') + id +
      '  review=' + wf.reviewStatus(r, id) +
      '  verify=' + (vs.ok ? 'ok' : 'pending') +
      '  ' + (mk.title || '')
    )
  }
}

// --- check --------------------------------------------------------------

function cmdCheck(args) {
  const r = root()
  const cfg = wf.readConfig(r)
  const st = wf.readState(r)
  const only = args.filter(function (a) { return a.indexOf('--') !== 0 })
  const names = Object.keys(cfg.checks).filter(function (k) {
    const c = cfg.checks[k]
    if (!c.enabled || !String(c.command || '').trim()) return false
    return only.length === 0 || only.indexOf(k) !== -1
  })

  if (!names.length) {
    console.log('실행할 자동 체크가 없다. .workflow/config.json 의 checks 를 확인하라.')
    return
  }

  const results = {}
  let allOk = true
  for (const name of names) {
    const command = cfg.checks[name].command
    process.stdout.write('\n=== ' + name + ': ' + command + '\n')
    let code = 0
    let out = ''
    try {
      out = cp.execSync(command, { cwd: r, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', timeout: 15 * 60 * 1000 })
    } catch (e) {
      code = typeof e.status === 'number' ? e.status : 1
      out = String((e.stdout || '') + (e.stderr || ''))
    }
    const tail = out.split('\n').slice(-25).join('\n')
    process.stdout.write(tail.trim() + '\n')
    process.stdout.write('--- ' + name + ' => ' + (code === 0 ? 'pass' : 'fail (exit ' + code + ')') + '\n')
    results[name] = { status: code === 0 ? 'pass' : 'fail', exit: code }
    if (code !== 0) allOk = false
  }

  if (st.task) {
    const dest = path.join(wf.taskDir(r, st.task), 'checks.json')
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.writeFileSync(dest, JSON.stringify({ task: st.task, at: new Date().toISOString(), results: results }, null, 2) + '\n')
  }

  console.log('\n요약: ' + names.map(function (n) { return n + '=' + results[n].status }).join('  '))
  console.log(allOk ? '자동 체크 전부 통과' : '실패한 체크가 있다. verify.md 에 fail 로 기록하고 고쳐라.')
  console.log('이 결과를 verify.md 의 wf:verify 마커에 그대로 옮겨 적어라. 실행하지 않은 항목에 pass 를 적지 마라.')
}

// --- override -----------------------------------------------------------

function cmdOverride(args) {
  const r = root()
  const minutes = parseInt(args[0], 10)
  const reason = args.slice(1).join(' ').trim()
  if (!minutes || minutes < 1 || minutes > 480) die('사용법: wfctl override <분(1-480)> "<사유>"')
  if (!reason) die('우회에는 사유가 필요하다.')
  const until = new Date(Date.now() + minutes * 60000).toISOString()
  fs.writeFileSync(
    path.join(wf.wfDir(r), 'override.json'),
    JSON.stringify({ until: until, reason: reason, at: new Date().toISOString() }, null, 2) + '\n'
  )
  wf.log(r, 'OVERRIDE-OPEN', minutes + '분\t' + reason)
  console.log('게이트 우회를 ' + minutes + '분간 연다 (~' + wf.localStamp(until) + ')')
  console.log('사유: ' + reason)
  console.log('우회 중 쓰기는 .workflow/gate.log 에 기록된다. 끝나면 `wfctl override-clear`.')
}

function cmdOverrideClear() {
  const r = root()
  try { fs.rmSync(path.join(wf.wfDir(r), 'override.json'), { force: true }) } catch (e) { /* 무시 */ }
  wf.log(r, 'OVERRIDE-CLOSE', '')
  console.log('게이트 우회를 닫았다.')
}

// --- 기타 ---------------------------------------------------------------

function cmdClearDirty() {
  const r = root()
  wf.clearDirty(r)
  console.log('수정 파일 기록을 비웠다.')
}

function cmdDoctor() {
  const r = root(false)
  console.log('wfctl ' + VERSION + ' / node ' + process.version + ' / ' + process.platform)
  console.log('플러그인 경로: ' + path.resolve(__dirname, '..'))
  if (!r) return console.log('현재 위치에 .workflow 없음 (워크플로우 미적용 프로젝트)')
  console.log('프로젝트 루트: ' + r)
  const files = ['state.json', 'config.json', 'requirements.md', 'architecture.md', 'backlog.yaml']
  for (const f of files) {
    console.log('  ' + (fs.existsSync(path.join(wf.wfDir(r), f)) ? 'O' : 'X') + ' .workflow/' + f)
  }
}

const HELP = [
  'wfctl ' + VERSION + ' — vibe-workflow 상태 제어',
  '',
  '  init [--force]              현재 디렉터리에 .workflow 를 만든다',
  '  status                      현재 단계와 게이트 상태를 출력한다',
  '  phase <단계> [--task ID]    단계를 전이한다 (define|plan|review|build|verify|idle)',
  '  task-new "<제목>"           다음 task 를 만들고 plan 단계로 전이한다',
  '  task-list                   task 목록과 게이트 상태',
  '  check [이름...]             config 의 자동 체크를 실제로 실행한다',
  '  override <분> "<사유>"      게이트를 한시적으로 연다',
  '  override-clear              우회를 닫는다',
  '  clear-dirty                 수정 파일 기록을 비운다',
  '  doctor                      설치/설정 점검',
].join('\n')

function main() {
  const argv = process.argv.slice(2)
  const cmd = argv[0]
  const rest = argv.slice(1)
  switch (cmd) {
    case 'init': return cmdInit(rest)
    case 'status': return cmdStatus()
    case 'phase': return cmdPhase(rest)
    case 'task-new': return cmdTaskNew(rest)
    case 'task-list': return cmdTaskList()
    case 'check': return cmdCheck(rest)
    case 'override': return cmdOverride(rest)
    case 'override-clear': return cmdOverrideClear()
    case 'clear-dirty': return cmdClearDirty()
    case 'doctor': return cmdDoctor()
    case '--version': return console.log(VERSION)
    default: return console.log(HELP)
  }
}

main()
