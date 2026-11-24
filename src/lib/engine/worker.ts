/// <reference types="vite/client" />

import init, { optimize_ratio, simulate } from './pkg/wos_sim_engine.js'

type RequestType = 'simulate' | 'optimize'

interface EngineRequest {
  id: number
  type: RequestType
  payload: Record<string, unknown>
}

interface EngineResponse {
  id: number
  ok: boolean
  result?: unknown
  error?: string
}

interface WorkerScope {
  onmessage: ((event: MessageEvent<EngineRequest>) => void) | null
  postMessage: (message: EngineResponse) => void
}

const scope = self as unknown as WorkerScope
const ready = init()

scope.onmessage = async (event) => {
  const { id, type, payload } = event.data
  try {
    await ready
    const request = JSON.stringify(payload)
    const result = type === 'simulate' ? simulate(request) : optimize_ratio(request)
    scope.postMessage({ id, ok: true, result: JSON.parse(result) as unknown })
  } catch (error) {
    scope.postMessage({
      id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
