import { expect, test } from 'claude-code/testing'

const stage = (n: number, title: string, done: boolean) => ({
  n, key: `k${n}`, title, file: `0${n}.md`, skill: `wf-s${n}`,
  status: done ? 'done' : 'missing', label: done ? 'done' : 'not started', complete: done,
})

const STATUS = {
  root: '/p', hub: '.workflow/README.md', done: 2, total: 4, current: 3,
  phases: [
    { name: 'Planning', stages: [stage(1, 'Research & brief', true), stage(2, 'Feature spec', true)] },
    { name: 'UX', stages: [stage(3, 'UX flowchart', false)] },
    { name: 'UI', stages: [stage(4, 'Low-fi wireframe', false)] },
  ],
}

const PANE = {
  plugin: 'vibe-workflow',
  component: 'Pane',
  requestId: 'vibe-progress',
  props: {
    title: 'Progress', isFocused: false, bodyColumns: 44, placement: 'dock',
    scroll: { offset: 0, bodyRows: 30 }, view: {},
  },
} as const

function engine(on: any, hasWorkflow: boolean, onRegister = () => {}) {
  on('command.register', () => { onRegister(); return { value: { command: 'progress' } } })
  on('session.cwd', () => ({ value: hasWorkflow ? '/p' : '/x' }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }))
  on('clock.every', () => ({ value: { cancel() {} } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_: unknown, e: { cwd: string }) => ({ cwd: e.cwd }))
  on('fs.stat', () => { if (!hasWorkflow) throw new Error('ENOENT'); return { value: { kind: 'file', size: 1 } } })
  on('process.run', () => ({ value: { exitCode: 0, stdout: JSON.stringify(STATUS), stderr: '' } }))
}

test('the pane shows the current and next stage', async ($, on) => {
  engine(on, true)
  await $.session.start({ cwd: '/p', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /^Now / }))?.text).toBe('Now  3. UX flowchart → /wf-s3')
  expect((await ui.find({ type: 'Text', text: /^Next / }))?.text).toBe('Next 4. Low-fi wireframe')
  expect((await ui.find({ type: 'Text', text: /^vibe-workflow/ }))?.text).toBe('vibe-workflow · 2/4')
  await ui.unmount()
})

test('/progress returns the stage list as text', async ($, on) => {
  engine(on, true)
  await $.session.start({ cwd: '/p', surface: 'terminal', isInteractive: true })
  const out = await $.command.run({ command: 'progress' })
  expect(out.text).toContain('Now: 3. UX flowchart → /wf-s3')
  expect(out.text).toContain('[Planning] ██████ 2/2')
})

test('registers nothing without .workflow', async ($, on) => {
  let registered = false
  engine(on, false, () => { registered = true })
  await $.session.start({ cwd: '/x', surface: 'terminal', isInteractive: true })
  expect(registered).toBe(false)
})
