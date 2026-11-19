export type InstanceRow = {
  index: number
  name: string
  checked: boolean
  profile: string
  status: string
  tooltip: string
  active: boolean
}

export type EmulatorOption = { code: string; label: string; installed: boolean }

export type Task = { id: string; name: string; description: string; priority: number }

export type Snapshot = {
  emulator: string
  emulator_label: string
  emulator_options: EmulatorOption[]
  tool_running: boolean
  max_instances: number
  instances: InstanceRow[]
  profiles: Record<string, string[]>
  tasks: Task[]
  startup?: {
    requirements_reminder?: boolean
    needs_emulator_choice?: boolean
    installed_emulators?: string[]
  }
}

export type LogEntry = { seq: number; time: number; level: string; message: string }
export type DialogPayload = { title: string; text: string }
export type ActionResult = { ok: boolean; error?: string | null }

export type Preferences = {
  emulator: string | null
  emulator_paths: Record<string, Record<string, string>>
  task_order: string[]
  kill_beast_march: number
  kill_beast_march_set: boolean
  bear_trap_marches: number[]
  bear_rally_call_march: number
  bear_rally_call_march_set: boolean
  gather_resource: string
  intel_mode: string
  mystery_shop_level: string
  debug_mode: boolean
  remember_schedule: boolean
  start_minimized: boolean
}

export type PathField = { key: string; label: string; kind: 'directory' | 'file' }

export type PreferencesPayload = {
  preferences: Preferences
  tasks: Task[]
  emulators: EmulatorOption[]
  activeEmulator: string
  labels: {
    gather: Record<string, string>
    intel: Record<string, string>
    mysteryShop: Record<string, string>
    pathFields: Record<string, PathField[]>
  }
  options: { gather: string[]; intel: string[]; mysteryShop: string[] }
  bounds: {
    killBeastMarch: [number, number]
    bearTrapMarch: [number, number]
    bearTrapCount: number
    bearRallyCallMarch: [number, number]
  }
}
