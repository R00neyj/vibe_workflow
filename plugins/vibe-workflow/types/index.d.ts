export type Stage = {
  n: number
  key: string
  title: string
  file: string
  skill: string
  status: string
  label: string
  complete: boolean
}
export type Phase = { name: string; stages: Stage[] }
export type Progress = {
  root: string
  mode?: string
  hub: string
  done: number
  total: number
  current: number | null
  phases: Phase[]
}
export type Live = { label: string; at: number }

declare module 'claude-code' {
  interface PluginState {
    'vibe-workflow': {
      progress: Shaped<Progress | null>
      error: Shaped<string | null>
      live: Shaped<Live | null>
      toggled: Shaped<Record<string, boolean>>
    }
  }
}
