'use strict'
// vibe-workflow 공용 모듈. node 내장만 사용, 진행 상태는 산출물 마커에서만 파생함.

const fs = require('fs')
const path = require('path')

const WF_DIR = '.workflow'
const CONFIG_FILE = 'config.json'

const PHASES = ['기획', 'UX', 'UI', '개발', '릴리즈']

const STAGES = [
  { n: 1, key: 'brief', phase: '기획', title: '사전조사·기획서', file: '01-brief.md', skill: 'wf-brief', done: 'done' },
  { n: 2, key: 'spec', phase: '기획', title: '기능 명세', file: '02-spec.md', skill: 'wf-spec', done: 'done' },
  { n: 3, key: 'flow', phase: 'UX', title: 'UX 플로우차트', file: '03-flow.md', skill: 'wf-flow', done: 'done' },
  { n: 4, key: 'wireframe', phase: 'UI', title: '저해상도 와이어프레임', file: '04-wireframe/index.html', skill: 'wf-wireframe', done: 'done' },
  { n: 5, key: 'wireframe-review', phase: 'UI', title: '와이어프레임 검토', file: '05-wireframe-review.md', skill: 'wf-wireframe-review', done: 'approved' },
  { n: 6, key: 'prototype', phase: '개발', title: '프로토타입 제작', file: '06-prototype.md', skill: 'wf-prototype', done: 'done' },
  { n: 7, key: 'usability', phase: '개발', title: '프로토타입 사용성 테스트', file: '07-usability.md', skill: 'wf-usability', done: 'done' },
  { n: 8, key: 'prerelease', phase: '릴리즈', title: '프리릴리즈 배포', file: '08-prerelease.md', skill: 'wf-prerelease', done: 'deployed' },
  { n: 9, key: 'internal-test', phase: '릴리즈', title: '내부 테스트', file: '09-internal-test.md', skill: 'wf-internal-test', done: 'done' },
  { n: 10, key: 'release', phase: '릴리즈', title: '릴리즈', file: '10-release.md', skill: 'wf-release', done: 'released' },
]

// 단계별 템플릿 사본 목록. [템플릿 경로, .workflow 기준 대상 경로]
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

// --- 경로 ---------------------------------------------------------------

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

// --- 시간 표기 ----------------------------------------------------------
// 저장·비교는 UTC ISO, 사람이 읽는 값만 로컬 시간대로 표기함.

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

// --- 설정 ---------------------------------------------------------------

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

// --- 마커 ---------------------------------------------------------------
// 형식: <!-- wf:<kind> 다음 줄부터 key: value ... -->

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

// --- 진행 판정 ----------------------------------------------------------

/** 'missing' | 'no-marker' | 마커 status 값. complete 는 status 가 단계의 done 값과 같을 때만 참. */
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

// --- 위키 링크 / 허브 ----------------------------------------------------

const HUB_FILE = 'README.md'
const INDEX_BEGIN = '<!-- wf:index:begin -->'
const INDEX_END = '<!-- wf:index:end -->'
const STATUS_LABEL = { missing: '미착수', 'no-marker': '마커 없음', draft: '작성 중' }

function statusLabel(row) {
  if (row.complete) return '완료'
  return STATUS_LABEL[row.status] || row.status
}

function stageLink(stage) { return '[' + stage.n + '. ' + stage.title + '](' + stage.file + ')' }

/** 단계 문서 상단 네비. 문서는 .workflow 바로 아래에 있다고 가정함. */
function navLine(stage) {
  const i = STAGES.indexOf(stage)
  const parts = ['[← 전체 흐름](' + HUB_FILE + ')']
  if (i > 0) parts.push('이전: ' + stageLink(STAGES[i - 1]))
  if (i < STAGES.length - 1) parts.push('다음: ' + stageLink(STAGES[i + 1]))
  return parts.join(' · ')
}

function renderIndex(p) {
  const lines = ['| 단계 | # | 문서 | 상태 | 스킬 |', '| --- | --- | --- | --- | --- |']
  for (const row of p.rows) {
    const s = row.stage
    const cur = p.next === s ? ' ◀ 현재' : ''
    lines.push('| ' + s.phase + ' | ' + s.n + ' | [' + s.title + '](' + s.file + ') | ' + statusLabel(row) + cur + ' | `/' + s.skill + '` |')
  }
  lines.push('')
  lines.push(p.next ? '다음 할 일: **' + p.next.n + '. ' + p.next.title + '** → `/' + p.next.skill + '`' : '전 단계 완료.')
  return lines.join('\n')
}

/** 허브 텍스트의 index 블록만 교체. 블록이 없으면 null. */
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
