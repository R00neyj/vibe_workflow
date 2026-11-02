import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Live, Phase, Progress, Stage } from '../types'

// Progress panel — read-only UI. Injects nothing into prompts and blocks no tool call.

const PANE = 'vibe-progress'
const TITLE = 'Progress'
const COMMAND = 'progress'
const PANE_COLUMNS = 44
const INLINE_ROWS = 14
const REFRESH_DEBOUNCE_MS = 1500
const REFRESH_EVERY_MS = 30000
const RUN_TIMEOUT_MS = 15000
const PHASE_COLS = 12
const BAR_CELLS = 6
const REFRESH_ON = new Set(['Bash', 'Edit', 'Write', 'Skill', 'Agent'])

const progress = atom({ plugin: 'vibe-workflow', key: 'progress' } as const, null, { shape: 'progress-1' })
const error = atom({ plugin: 'vibe-workflow', key: 'error' } as const, null, { shape: 'error-1' })
const live = atom({ plugin: 'vibe-workflow', key: 'live' } as const, null, { shape: 'live-1' })
const toggled = atom({ plugin: 'vibe-workflow', key: 'toggled' } as const, {}, { shape: 'toggled-1' })

const cols = (s: string) => [...s].reduce((n, ch) => n + (/[ᄀ-ᅟ⺀-꓏가-힣豈-﫿＀-｠]/.test(ch) ? 2 : 1), 0)
const padCols = (s: string, w: number) => s + ' '.repeat(Math.max(1, w - cols(s)))

const allStages = (p: Progress): Stage[] => p.phases.flatMap(ph => ph.stages)
const phaseDone = (ph: Phase) => ph.stages.filter(s => s.complete).length
const isCurrentPhase = (ph: Phase, p: Progress) => ph.stages.some(s => s.n === p.current)
const stageMark = (s: Stage, p: Progress) => (s.complete ? '✓' : s.n === p.current ? '▶' : '·')

function bar(done: number, total: number): string {
  const n = total ? Math.round((done / total) * BAR_CELLS) : 0
  return '█'.repeat(n) + '░'.repeat(BAR_CELLS - n)
}

function neighbours(p: Progress) {
  const list = allStages(p)
  const i = list.findIndex(s => s.n === p.current)
  return { prev: i > 0 ? list[i - 1] : undefined, cur: i >= 0 ? list[i] : undefined, next: i >= 0 ? list[i + 1] : undefined }
}

const phaseOf = (p: Progress, s: Stage) => p.phases.find(ph => ph.stages.includes(s))?.name ?? ''

// One-line summary under the prompt when the pane is not docked
function statusLine(p: Progress): string {
  const { cur, next } = neighbours(p)
  if (!cur) return `Progress ✓ ${p.total}/${p.total} all stages done`
  const parts = [`Progress ${p.done}/${p.total} ▶ [${phaseOf(p, cur)}] ${cur.n}. ${cur.title} → /${cur.skill}`]
  if (next) parts.push(`Next ${next.n}. ${next.title}`)
  return parts.join(' · ')
}

function commandText(p: Progress, err: string | null): string {
  const lines = [`vibe-workflow progress ${p.done}/${p.total}  hub: ${p.hub}`]
  for (const ph of p.phases) {
    lines.push(`[${ph.name}] ${bar(phaseDone(ph), ph.stages.length)} ${phaseDone(ph)}/${ph.stages.length}`)
    for (const s of ph.stages) lines.push(`  ${stageMark(s, p)} ${String(s.n).padStart(2)}. ${padCols(s.title, 26)}${s.label}`)
  }
  const { cur } = neighbours(p)
  lines.push(cur ? `Now: ${cur.n}. ${cur.title} → /${cur.skill}` : 'All stages done. For a new feature: /wf-next')
  if (err) lines.push(err)
  return lines.join('\n')
}

let root: string | undefined
let asked = false
let placement: 'dock' | 'inline' | undefined
let lastLine: string | undefined
let pending: { cancel: () => void } | undefined
let inflight: Promise<void> | undefined
let again = false

async function runOnce($: EngineInterface) {
  if (!root) return
  try {
    const argv = ['node', `${$.plugin.root}/scripts/wfctl.js`, 'status', '--json']
    const { exitCode, stdout, stderr } = await $.process.run(argv, { cwd: root, timeoutMs: RUN_TIMEOUT_MS })
    if (exitCode !== 0) throw new Error((stderr || `exit ${exitCode}`).trim())
    const next = JSON.parse(stdout) as Progress
    await update($, progress, () => next)
    await update($, error, () => null)
    lastLine = statusLine(next)
  } catch (err) {
    await update($, error, () => `Refresh failed (showing last values): ${String(err).slice(0, 160)}`)
  }
  await syncStatus($)
}

// Clear the status line while the pane is docked and visible
async function syncStatus($: EngineInterface) {
  const pane = (await $.ui.panes().catch(() => [])).find(x => x.id === PANE)
  const docked = placement === 'dock' && !!pane?.isPlaced && pane.isShown
  $.ui.status(docked ? undefined : lastLine)
}

// A refresh requested mid-run is not dropped: run once more
function refresh($: EngineInterface): Promise<void> {
  if (inflight) {
    again = true
    return inflight
  }
  inflight = (async () => {
    do {
      again = false
      await runOnce($)
    } while (again)
    inflight = undefined
  })()
  return inflight
}

function schedule($: EngineInterface) {
  pending?.cancel()
  pending = $.clock.after(REFRESH_DEBOUNCE_MS, () => refresh($))
}

function skillLabel(e: { tool: string }): string | undefined {
  if (e.tool !== 'Skill' || !('skill' in e) || typeof e.skill !== 'string') return undefined
  const name = e.skill.replace(/^.*:/, '')
  return name.startsWith('wf-') ? `/${name}` : undefined
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const ran = await next(e)
    const cwd = await $.session.cwd()
    const stat = await $.fs.stat(`${cwd}/.workflow/config.json`).catch(() => null)
    if (!stat) return ran
    root = cwd
    await $.command.register({ name: COMMAND, description: 'Open the vibe-workflow progress panel and print progress across 12 stages' })
    await refresh($)
    void $.ui.open({ id: PANE, title: TITLE, columns: PANE_COLUMNS })
    $.clock.every(REFRESH_EVERY_MS, () => refresh($))
    return ran
  })

  on('command.run', { command: COMMAND }, async $ => {
    await refresh($)
    asked = true
    await $.ui.open({ id: PANE, title: TITLE, columns: PANE_COLUMNS, rows: INLINE_ROWS })
    const p = await read($, progress)
    const err = await read($, error)
    if (!p) return { text: err ?? 'No progress info — run /wf-init if there is no .workflow' }
    return { text: commandText(p, err) }
  })

  on('tool.call', async ($, e, next) => {
    const label = root ? skillLabel(e) : undefined
    if (label) await update($, live, () => ({ label, at: Date.now() }) as Live)
    const ran = await next(e)
    if (root && REFRESH_ON.has(e.tool)) schedule($)
    return ran
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    if (placement !== e.props.placement) {
      placement = e.props.placement
      void syncStatus($)
    }
    // An auto-opened pane that lands inline in a narrow window closes; the status line stands in
    if (e.props.placement === 'inline' && !asked) {
      void $.ui.close({ id: PANE })
      return <Text dimColor>Narrow window — see the status line or /progress</Text>
    }
    const p = await read($, progress)
    const err = await read($, error)
    const now = await read($, live)
    const open = await read($, toggled)
    if (!p) return <Text dimColor>{err ?? 'Reading progress…'}</Text>
    const { prev, cur, next } = neighbours(p)

    return (
      <Box flexDirection="column">
        <Text bold>vibe-workflow · {p.done}/{p.total}</Text>
        {p.phases.map(ph => {
          const isCur = isCurrentPhase(ph, p)
          const isDone = phaseDone(ph) === ph.stages.length
          const color = isCur ? 'cyan' : undefined
          const dim = !isCur && !isDone
          const isOpen = open[ph.name] ?? isCur
          return (
            <Box flexDirection="column">
              <Box flexDirection="row">
                <Box width={4} flexShrink={0}>
                  <Button key={`toggle-${ph.name}`} plain dimColor label={isOpen ? '[-]' : '[+]'} onPress={() => update($, toggled, t => ({ ...t, [ph.name]: !isOpen }))} />
                </Box>
                <Box width={2} flexShrink={0}><Text color={color} dimColor={dim}>{isCur ? '▶' : isDone ? '✓' : '·'}</Text></Box>
                <Box width={PHASE_COLS} flexShrink={0}><Text color={color} dimColor={dim}>{ph.name}</Text></Box>
                <Box width={BAR_CELLS + 1} flexShrink={0}><Text color={color} dimColor={dim}>{bar(phaseDone(ph), ph.stages.length)}</Text></Box>
                <Text color={color} dimColor={dim}>{`${phaseDone(ph)}/${ph.stages.length}`}</Text>
              </Box>
              {isOpen && ph.stages.map(s => (
                <Box paddingLeft={6}>
                  <Text color={s.n === p.current ? 'cyan' : undefined} dimColor={s.complete}>{`${stageMark(s, p)} ${s.n}. ${s.title}`}</Text>
                </Box>
              ))}
            </Box>
          )
        })}
        <Text> </Text>
        {prev && <Text dimColor>Prev {prev.n}. {prev.title}</Text>}
        {cur && <Text color="cyan">Now  {cur.n}. {cur.title} → /{cur.skill}</Text>}
        {cur && <Text dimColor>      {cur.label} · {cur.file}</Text>}
        {next && <Text dimColor>Next {next.n}. {next.title}</Text>}
        {!cur && <Text color="green">All stages done — for a new feature: /wf-next</Text>}
        {now && <Text dimColor>Last {now.label}</Text>}
        <Text dimColor>Hub  {p.hub}</Text>
        {err && <Text color="red">{err}</Text>}
      </Box>
    )
  })
}
