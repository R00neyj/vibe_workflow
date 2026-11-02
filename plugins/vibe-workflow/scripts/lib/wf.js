'use strict'
// vibe-workflow shared module. Node built-ins only; progress is derived from document markers alone.

const fs = require('fs')
const path = require('path')

const WF_DIR = '.workflow'
const CONFIG_FILE = 'config.json'

const PHASES = ['Planning', 'UX', 'UI', 'Development', 'Release']

const STAGES = [
  { n: 1, key: 'brief', phase: 'Planning', title: 'Research & brief', file: '01-brief.md', skill: 'wf-brief', done: 'done' },
  { n: 2, key: 'spec', phase: 'Planning', title: 'Feature spec', file: '02-spec.md', skill: 'wf-spec', done: 'done' },
  { n: 3, key: 'flow', phase: 'UX', title: 'UX flowchart', file: '03-flow.md', skill: 'wf-flow', done: 'done' },
  { n: 4, key: 'wireframe', phase: 'UI', title: 'Low-fi wireframe', file: '04-wireframe/index.html', skill: 'wf-wireframe', done: 'done' },
  { n: 5, key: 'wireframe-review', phase: 'UI', title: 'Wireframe review', file: '05-wireframe-review.md', skill: 'wf-wireframe-review', done: 'approved' },
  { n: 6, key: 'prototype', phase: 'Development', title: 'Prototype', file: '06-prototype.md', skill: 'wf-prototype', done: 'done' },
  { n: 7, key: 'usability', phase: 'Development', title: 'Usability test', file: '07-usability.md', skill: 'wf-usability', done: 'done' },
  { n: 8, key: 'prerelease', phase: 'Release', title: 'Pre-release', file: '08-prerelease.md', skill: 'wf-prerelease', done: 'deployed' },
  { n: 9, key: 'internal-test', phase: 'Release', title: 'Internal test', file: '09-internal-test.md', skill: 'wf-internal-test', done: 'done' },
  { n: 10, key: 'release', phase: 'Release', title: 'Release', file: '10-release.md', skill: 'wf-release', done: 'released' },
]

// Per-stage template copies: [template path, destination relative to .workflow]
const STAGE_TEMPLATES = {
  'wireframe': [['04-wireframe/index.html', '04-wireframe/index.html'], ['04-wireframe/wireframe.css', '04-wireframe/wireframe.css']],
  'internal-test': [['09-internal-test.md', '09-internal-test.md'], ['09-tester-guide.md', '09-tester-guide.md']],
}

const DEFAULT_CONFIG = {
  checks: {
    test: { enabled: false, command: '' },
    build: { enabled: false, command: '' },
    lint: { enabled: false, command: '' },
    typecheck: { enabled: false, command: '' },
  },
  run: '',
  deploy: { prerelease: '', release: '' },
}

// --- paths ---------------------------------------------------------------

function findRoot(start) {
  let dir = path.resolve(start || process.cwd())
  for (;;) {
    if (fs.existsSync(path.join(dir, WF_DIR, CONFIG_FILE))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

function wfDir(root) { return path.join(root, WF_DIR) }

function findStage(keyOrNumber) {
  const k = String(keyOrNumber || '').toLowerCase()
  return STAGES.find(function (s) { return s.key === k || String(s.n) === k }) || null
}

function stageTemplates(stage) {
  return STAGE_TEMPLATES[stage.key] || [[stage.file, stage.file]]
}

// --- time ----------------------------------------------------------
// Store and compare in UTC ISO; only human-facing values use local time.

function pad2(n) { return String(n).padStart(2, '0') }

function localDate(value) {
  const d = value === undefined ? new Date() : new Date(value)
  if (isNaN(d.getTime())) return String(value)
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
}

function localStamp(value) {
  const d = value === undefined ? new Date() : new Date(value)
  if (isNaN(d.getTime())) return String(value)
  return localDate(d) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes())
}

// --- config ---------------------------------------------------------------

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch (e) { return fallback }
}

function readConfig(root) {
  const c = readJson(path.join(wfDir(root), CONFIG_FILE), {})
  return Object.assign({}, DEFAULT_CONFIG, c, {
    checks: Object.assign({}, DEFAULT_CONFIG.checks, c.checks || {}),
    deploy: Object.assign({}, DEFAULT_CONFIG.deploy, c.deploy || {}),
  })
}

function enabledChecks(cfg) {
  return Object.keys(cfg.checks).filter(function (k) {
    const c = cfg.checks[k]
    return c && c.enabled && String(c.command || '').trim()
  })
}

// --- markers ---------------------------------------------------------------
// Format: <!-- wf:<kind> then key: value lines ... -->

function parseMarker(text, kind) {
  const m = String(text || '').match(new RegExp('<!--\\s*wf:' + kind + '\\s*([\\s\\S]*?)-->'))
  if (!m) return null
  const out = {}
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^\s*([A-Za-z_][\w-]*)\s*:\s*(.*?)\s*$/)
    if (kv) out[kv[1]] = kv[2]
  }
  return out
}

function readMarker(file, kind) {
  try { return parseMarker(fs.readFileSync(file, 'utf8'), kind) } catch (e) { return null }
}

// --- progress ----------------------------------------------------------

/** 'missing' | 'no-marker' | marker status; complete only when status equals the stage's done value. */
function stageStatus(root, stage) {
  const file = path.join(wfDir(root), stage.file)
  if (!fs.existsSync(file)) return { status: 'missing', complete: false }
  const mk = readMarker(file, stage.key)
  if (!mk) return { status: 'no-marker', complete: false }
  const status = String(mk.status || 'draft').toLowerCase()
  return { status: status, complete: status === stage.done, marker: mk }
}

function progress(root) {
  const rows = STAGES.map(function (s) { return Object.assign({ stage: s }, stageStatus(root, s)) })
  const next = rows.find(function (r) { return !r.complete }) || null
  return { rows: rows, next: next ? next.stage : null }
}

// --- wiki links / hub ----------------------------------------------------

const HUB_FILE = 'README.md'
const INDEX_BEGIN = '<!-- wf:index:begin -->'
const INDEX_END = '<!-- wf:index:end -->'
const STATUS_LABEL = { missing: 'not started', 'no-marker': 'no marker', draft: 'in progress' }

function statusLabel(row) {
  if (row.complete) return 'done'
  return STATUS_LABEL[row.status] || row.status
}

function stageLink(stage) { return '[' + stage.n + '. ' + stage.title + '](' + stage.file + ')' }

/** Nav line at the top of a stage doc; assumes the doc sits directly under .workflow. */
function navLine(stage) {
  const i = STAGES.indexOf(stage)
  const parts = ['[← Hub](' + HUB_FILE + ')']
  if (i > 0) parts.push('Prev: ' + stageLink(STAGES[i - 1]))
  if (i < STAGES.length - 1) parts.push('Next: ' + stageLink(STAGES[i + 1]))
  return parts.join(' · ')
}

function renderIndex(p) {
  const lines = ['| Phase | # | Doc | Status | Skill |', '| --- | --- | --- | --- | --- |']
  for (const row of p.rows) {
    const s = row.stage
    const cur = p.next === s ? ' ◀ now' : ''
    lines.push('| ' + s.phase + ' | ' + s.n + ' | [' + s.title + '](' + s.file + ') | ' + statusLabel(row) + cur + ' | `/' + s.skill + '` |')
  }
  lines.push('')
  lines.push(p.next ? 'Next up: **' + p.next.n + '. ' + p.next.title + '** → `/' + p.next.skill + '`' : 'All stages done.')
  return lines.join('\n')
}

/** Replace only the index block of the hub text; null when the block is missing. */
function replaceIndexBlock(text, body) {
  const a = text.indexOf(INDEX_BEGIN)
  const b = text.indexOf(INDEX_END)
  if (a === -1 || b < a) return null
  return text.slice(0, a + INDEX_BEGIN.length) + '\n' + body + '\n' + text.slice(b)
}

module.exports = {
  HUB_FILE: HUB_FILE,
  statusLabel: statusLabel,
  navLine: navLine,
  renderIndex: renderIndex,
  replaceIndexBlock: replaceIndexBlock,
  WF_DIR: WF_DIR,
  CONFIG_FILE: CONFIG_FILE,
  PHASES: PHASES,
  STAGES: STAGES,
  DEFAULT_CONFIG: DEFAULT_CONFIG,
  findRoot: findRoot,
  wfDir: wfDir,
  findStage: findStage,
  stageTemplates: stageTemplates,
  localDate: localDate,
  localStamp: localStamp,
  readConfig: readConfig,
  enabledChecks: enabledChecks,
  parseMarker: parseMarker,
  readMarker: readMarker,
  stageStatus: stageStatus,
  progress: progress,
}
