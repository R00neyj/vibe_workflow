#!/usr/bin/env node
'use strict'
// wfctl — vibe-workflow 산출물 생성·진행 확인·체크/배포 실행 CLI.

const fs = require('fs')
const path = require('path')
const cp = require('child_process')
const wf = require('./lib/wf.js')

const VERSION = '0.2.0'
const CHECK_TIMEOUT_MS = 15 * 60 * 1000
const OUTPUT_TAIL_LINES = 25
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/
const DEPLOY_TARGETS = ['prerelease', 'release']

function die(msg) {
  process.stderr.write(msg + '\n')
  process.exit(1)
}

function requireRoot() {
  const r = wf.findRoot(process.cwd())
  if (!r) die('.workflow/config.json 을 찾지 못함. 먼저 `wfctl init` 실행.')
  return r
}

function templateDir() { return path.join(__dirname, '..', 'templates') }

function render(templateRel, vars) {
  let text = fs.readFileSync(path.join(templateDir(), templateRel), 'utf8')
  for (const k of Object.keys(vars)) text = text.split('{{' + k + '}}').join(vars[k])
  return text
}

function writeNew(dest, text, force) {
  if (fs.existsSync(dest) && !force) return false
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, text)
  return true
}

// --- init ---------------------------------------------------------------

function readPackageScripts(dir) {
  try { return JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).scripts || {} } catch (e) { return {} }
}

function detectConfig(dir) {
  const cfg = JSON.parse(JSON.stringify(wf.DEFAULT_CONFIG))
  const s = readPackageScripts(dir)
  for (const name of ['test', 'build', 'lint', 'typecheck']) {
    if (s[name]) cfg.checks[name] = { enabled: true, command: 'npm run ' + name + ' --silent' }
  }
  if (!cfg.checks.typecheck.enabled && fs.existsSync(path.join(dir, 'tsconfig.json'))) {
    cfg.checks.typecheck = { enabled: true, command: 'npx tsc --noEmit' }
  }
  if (s.dev) cfg.run = 'npm run dev'
  else if (s.start) cfg.run = 'npm start'
  return cfg
}

function cmdInit(args) {
  const dir = process.cwd()
  const cfgFile = path.join(dir, wf.WF_DIR, wf.CONFIG_FILE)
  if (fs.existsSync(cfgFile) && args.indexOf('--force') === -1) {
    die('.workflow 가 이미 있음. 설정을 다시 감지하려면 --force.')
  }
  const cfg = detectConfig(dir)
  fs.mkdirSync(path.dirname(cfgFile), { recursive: true })
  fs.writeFileSync(cfgFile, JSON.stringify(cfg, null, 2) + '\n')
  const hub = path.join(dir, wf.WF_DIR, wf.HUB_FILE)
  writeNew(hub, render(wf.HUB_FILE, { DATE: wf.localDate(), PROJECT: path.basename(dir) }), false)
  syncHub(dir)
  console.log('.workflow 생성 완료 — 허브: .workflow/' + wf.HUB_FILE)
  console.log('감지된 체크: ' + (wf.enabledChecks(cfg).join(', ') || '없음'))
  console.log('실행 명령  : ' + (cfg.run || '없음'))
  console.log('다음 단계  : /wf-brief (1. 사전조사·기획서)')
}

// --- status -------------------------------------------------------------

/** 허브의 index 블록을 재생성. 허브가 없거나 블록이 없으면 false. */
function syncHub(r) {
  const hub = path.join(wf.wfDir(r), wf.HUB_FILE)
  let text
  try { text = fs.readFileSync(hub, 'utf8') } catch (e) { return false }
  const next = wf.replaceIndexBlock(text, wf.renderIndex(wf.progress(r)))
  if (next === null) return false
  if (next !== text) fs.writeFileSync(hub, next)
  return true
}

function cmdSync() {
  const r = requireRoot()
  if (!syncHub(r)) die('.workflow/' + wf.HUB_FILE + ' 가 없거나 wf:index 블록이 없음. 템플릿의 begin/end 마커 두 줄을 복구.')
  console.log('허브 갱신: .workflow/' + wf.HUB_FILE)
}

function cmdStatus() {
  const r = requireRoot()
  const p = wf.progress(r)
  console.log('프로젝트: ' + r)
  for (const phase of wf.PHASES) {
    console.log('\n[' + phase + ']')
    for (const row of p.rows.filter(function (x) { return x.stage.phase === phase })) {
      const mark = row.complete ? 'v' : (p.next === row.stage ? '>' : ' ')
      const s = row.stage
      console.log(' ' + mark + ' ' + String(s.n).padStart(2) + '. ' + s.title + ' — ' + wf.statusLabel(row) + '  (.workflow/' + s.file + ')')
    }
  }
  if (!p.next) return console.log('\n전 단계 완료. 기능 추가 시 /wf-spec 부터 다시 진행.')
  console.log('\n다음: ' + p.next.n + '. ' + p.next.title + ' → /' + p.next.skill)
}

// --- new / screen -------------------------------------------------------

function cmdNew(args) {
  const r = requireRoot()
  const stage = wf.findStage(args[0])
  if (!stage) die('사용법: wfctl new <단계>  단계: ' + wf.STAGES.map(function (s) { return s.key }).join(' | '))
  const force = args.indexOf('--force') !== -1
  const vars = { DATE: wf.localDate(), PROJECT: path.basename(r), NAV: wf.navLine(stage) }
  for (const pair of wf.stageTemplates(stage)) {
    const rel = path.join(wf.WF_DIR, pair[1])
    const made = writeNew(path.join(r, rel), render(pair[0], vars), force)
    console.log((made ? '생성: ' : '이미 있음(유지): ') + rel.replace(/\\/g, '/'))
  }
  syncHub(r)
}

function cmdScreen(args) {
  const r = requireRoot()
  const slug = args[0]
  const title = args.slice(1).join(' ').trim()
  if (!slug || !SLUG_RE.test(slug) || !title) die('사용법: wfctl screen <slug(영소문자·숫자·-)> "<화면명>"')
  const rel = path.join(wf.WF_DIR, '04-wireframe', slug + '.html')
  const made = writeNew(path.join(r, rel), render('04-wireframe/screen.html', { SLUG: slug, TITLE: title }), false)
  console.log((made ? '생성: ' : '이미 있음(유지): ') + rel.replace(/\\/g, '/'))
}

// --- check / deploy -----------------------------------------------------

function runCommand(root, command) {
  try {
    const out = cp.execSync(command, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', timeout: CHECK_TIMEOUT_MS })
    return { code: 0, out: out }
  } catch (e) {
    return { code: typeof e.status === 'number' ? e.status : 1, out: String((e.stdout || '') + (e.stderr || '')) }
  }
}

function printRun(name, command, res) {
  console.log('\n=== ' + name + ': ' + command)
  console.log(res.out.split('\n').slice(-OUTPUT_TAIL_LINES).join('\n').trim())
  console.log('--- ' + name + ' => ' + (res.code === 0 ? 'pass' : 'fail (exit ' + res.code + ')'))
}

function cmdCheck(args) {
  const r = requireRoot()
  const cfg = wf.readConfig(r)
  const names = wf.enabledChecks(cfg).filter(function (k) { return !args.length || args.indexOf(k) !== -1 })
  if (!names.length) return console.log('실행할 체크 없음. .workflow/config.json 의 checks 확인.')
  const results = names.map(function (name) {
    const res = runCommand(r, cfg.checks[name].command)
    printRun(name, cfg.checks[name].command, res)
    return name + '=' + (res.code === 0 ? 'pass' : 'fail')
  })
  console.log('\n요약: ' + results.join('  '))
  if (results.some(function (x) { return /=fail$/.test(x) })) process.exitCode = 1
}

function cmdDeploy(args) {
  const r = requireRoot()
  const target = args[0]
  if (DEPLOY_TARGETS.indexOf(target) === -1) die('사용법: wfctl deploy <' + DEPLOY_TARGETS.join('|') + '>')
  const command = String(wf.readConfig(r).deploy[target] || '').trim()
  if (!command) {
    console.log('config.json 의 deploy.' + target + ' 가 비어 있음. 수동 배포 후 결과만 문서에 기록.')
    return
  }
  const res = runCommand(r, command)
  printRun('deploy:' + target, command, res)
  if (res.code !== 0) process.exitCode = 1
}

// --- doctor -------------------------------------------------------------

function cmdDoctor() {
  console.log('wfctl ' + VERSION + ' / node ' + process.version + ' / ' + process.platform)
  console.log('플러그인 경로: ' + path.resolve(__dirname, '..'))
  const r = wf.findRoot(process.cwd())
  if (!r) return console.log('현재 위치에 .workflow 없음')
  const cfg = wf.readConfig(r)
  console.log('프로젝트 루트: ' + r)
  console.log('체크  : ' + (wf.enabledChecks(cfg).join(', ') || '없음'))
  console.log('실행  : ' + (cfg.run || '없음'))
  console.log('배포  : prerelease=' + (cfg.deploy.prerelease || '없음') + ' / release=' + (cfg.deploy.release || '없음'))
}

const HELP = [
  'wfctl ' + VERSION + ' — vibe-workflow',
  '',
  '  init [--force]             .workflow/config.json 생성 (체크·실행 명령 자동 감지)',
  '  status                     10단계 진행 상황과 다음 단계',
  '  sync                       허브(README.md) 진행 표를 마커 기준으로 다시 그림',
  '  new <단계> [--force]      단계 산출물 템플릿 생성 (단계 키 또는 번호)',
  '  screen <slug> "<화면명>"   와이어프레임 화면 파일 생성',
  '  check [이름...]            config 의 체크 실행',
  '  deploy <prerelease|release> config 의 배포 명령 실행',
  '  doctor                     설치·설정 점검',
].join('\n')

const COMMANDS = {
  init: cmdInit,
  status: cmdStatus,
  sync: cmdSync,
  new: cmdNew,
  screen: cmdScreen,
  check: cmdCheck,
  deploy: cmdDeploy,
  doctor: cmdDoctor,
  '--version': function () { console.log(VERSION) },
}

function main() {
  const argv = process.argv.slice(2)
  const fn = COMMANDS[argv[0]]
  if (!fn) return console.log(HELP)
  return fn(argv.slice(1))
}

main()
