#!/usr/bin/env node
'use strict'
// wfctl — vibe-workflow CLI: create stage docs, show progress, run checks and deploys.

const fs = require('fs')
const path = require('path')
const cp = require('child_process')
const wf = require('./lib/wf.js')

const VERSION = '0.3.0'
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
  if (!r) die('.workflow/config.json not found. Run `wfctl init` first.')
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
    die('.workflow already exists. Use --force to re-detect the config.')
  }
  const cfg = detectConfig(dir)
  fs.mkdirSync(path.dirname(cfgFile), { recursive: true })
  fs.writeFileSync(cfgFile, JSON.stringify(cfg, null, 2) + '\n')
  const hub = path.join(dir, wf.WF_DIR, wf.HUB_FILE)
  writeNew(hub, render(wf.HUB_FILE, { DATE: wf.localDate(), PROJECT: path.basename(dir) }), false)
  syncHub(dir)
  console.log('.workflow created — hub: .workflow/' + wf.HUB_FILE)
  console.log('Detected checks: ' + (wf.enabledChecks(cfg).join(', ') || 'none'))
  console.log('Run command    : ' + (cfg.run || 'none'))
  console.log('Next step      : /wf-brief (1. Research & brief)')
}

// --- status -------------------------------------------------------------

/** Regenerate the hub index block; false when the hub or block is missing. */
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
  if (!syncHub(r)) die('.workflow/' + wf.HUB_FILE + ' is missing or has no wf:index block. Restore the begin/end marker lines from the template.')
  console.log('Hub updated: .workflow/' + wf.HUB_FILE)
}

function statusJson(r, p) {
  return {
    root: r,
    hub: path.join(wf.WF_DIR, wf.HUB_FILE).replace(/\\/g, '/'),
    done: p.rows.filter(function (x) { return x.complete }).length,
    total: p.rows.length,
    current: p.next ? p.next.n : null,
    phases: wf.PHASES.map(function (phase) {
      return {
        name: phase,
        stages: p.rows.filter(function (x) { return x.stage.phase === phase }).map(function (x) {
          const s = x.stage
          return { n: s.n, key: s.key, title: s.title, file: s.file, skill: s.skill, status: x.status, label: wf.statusLabel(x), complete: x.complete }
        }),
      }
    }),
  }
}

function cmdStatus(args) {
  const r = requireRoot()
  const p = wf.progress(r)
  if ((args || []).indexOf('--json') !== -1) return console.log(JSON.stringify(statusJson(r, p)))
  console.log('Project: ' + r)
  for (const phase of wf.PHASES) {
    console.log('\n[' + phase + ']')
    for (const row of p.rows.filter(function (x) { return x.stage.phase === phase })) {
      const mark = row.complete ? 'v' : (p.next === row.stage ? '>' : ' ')
      const s = row.stage
      console.log(' ' + mark + ' ' + String(s.n).padStart(2) + '. ' + s.title + ' — ' + wf.statusLabel(row) + '  (.workflow/' + s.file + ')')
    }
  }
  if (!p.next) return console.log('\nAll stages done. For a new feature, start again at /wf-spec.')
  console.log('\nNext: ' + p.next.n + '. ' + p.next.title + ' → /' + p.next.skill)
}

// --- new / screen -------------------------------------------------------

function cmdNew(args) {
  const r = requireRoot()
  const stage = wf.findStage(args[0])
  if (!stage) die('Usage: wfctl new <stage>  stages: ' + wf.STAGES.map(function (s) { return s.key }).join(' | '))
  const force = args.indexOf('--force') !== -1
  const vars = { DATE: wf.localDate(), PROJECT: path.basename(r), NAV: wf.navLine(stage) }
  for (const pair of wf.stageTemplates(stage)) {
    const rel = path.join(wf.WF_DIR, pair[1])
    const made = writeNew(path.join(r, rel), render(pair[0], vars), force)
    console.log((made ? 'Created: ' : 'Exists (kept): ') + rel.replace(/\\/g, '/'))
  }
  syncHub(r)
}

function cmdScreen(args) {
  const r = requireRoot()
  const slug = args[0]
  const title = args.slice(1).join(' ').trim()
  if (!slug || !SLUG_RE.test(slug) || !title) die('Usage: wfctl screen <slug(lowercase, digits, -)> "<screen name>"')
  const rel = path.join(wf.WF_DIR, '04-wireframe', slug + '.html')
  const made = writeNew(path.join(r, rel), render('04-wireframe/screen.html', { SLUG: slug, TITLE: title }), false)
  console.log((made ? 'Created: ' : 'Exists (kept): ') + rel.replace(/\\/g, '/'))
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
  if (!names.length) return console.log('No checks to run. See checks in .workflow/config.json.')
  const results = names.map(function (name) {
    const res = runCommand(r, cfg.checks[name].command)
    printRun(name, cfg.checks[name].command, res)
    return name + '=' + (res.code === 0 ? 'pass' : 'fail')
  })
  console.log('\nSummary: ' + results.join('  '))
  if (results.some(function (x) { return /=fail$/.test(x) })) process.exitCode = 1
}

function cmdDeploy(args) {
  const r = requireRoot()
  const target = args[0]
  if (DEPLOY_TARGETS.indexOf(target) === -1) die('Usage: wfctl deploy <' + DEPLOY_TARGETS.join('|') + '>')
  const command = String(wf.readConfig(r).deploy[target] || '').trim()
  if (!command) {
    console.log('deploy.' + target + ' in config.json is empty. Deploy manually and record the result in the doc.')
    return
  }
  const res = runCommand(r, command)
  printRun('deploy:' + target, command, res)
  if (res.code !== 0) process.exitCode = 1
}

// --- doctor -------------------------------------------------------------

function cmdDoctor() {
  console.log('wfctl ' + VERSION + ' / node ' + process.version + ' / ' + process.platform)
  console.log('Plugin path : ' + path.resolve(__dirname, '..'))
  const r = wf.findRoot(process.cwd())
  if (!r) return console.log('No .workflow here')
  const cfg = wf.readConfig(r)
  console.log('Project root: ' + r)
  console.log('Checks : ' + (wf.enabledChecks(cfg).join(', ') || 'none'))
  console.log('Run    : ' + (cfg.run || 'none'))
  console.log('Deploy : prerelease=' + (cfg.deploy.prerelease || 'none') + ' / release=' + (cfg.deploy.release || 'none'))
}

const HELP = [
  'wfctl ' + VERSION + ' — vibe-workflow',
  '',
  '  init [--force]              create .workflow/config.json (auto-detects checks and run command)',
  '  status [--json]             progress across 10 stages and next step (--json: for the panel)',
  '  sync                        redraw the hub (README.md) progress table from markers',
  '  new <stage> [--force]       create a stage doc from its template (stage key or number)',
  '  screen <slug> "<name>"      create a wireframe screen file',
  '  check [name...]             run the configured checks',
  '  deploy <prerelease|release> run the configured deploy command',
  '  doctor                      check install and config',
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
