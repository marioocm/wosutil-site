/**
 * Client-side engine bridge.
 *
 * The wasm module runs in a dedicated Web Worker so a 4096-seed simulation
 * never blocks the page.  One worker is shared by the simulator and the ratio
 * optimiser; the page's shared busy state already serialises both actions.
 */

type RequestType = 'simulate' | 'optimize'

interface EngineResponse {
  id: number
  ok: boolean
  result?: unknown
  error?: string
}

interface Pending {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
}

let worker: Worker | null = null
let initError: Error | null = null
let nextId = 1
const pending = new Map<number, Pending>()

function failPending(error: Error): void {
  for (const entry of pending.values()) entry.reject(error)
  pending.clear()
}

function ensureWorker(): Worker {
  if (worker) return worker
  if (initError) throw initError
  try {
    worker = new Worker(new URL('./worker.ts', import.meta.url), {
      type: 'module',
      name: 'wos-engine',
    })
  } catch (error) {
    initError =
      error instanceof Error ? error : new Error('The local engine could not start.')
    throw initError
  }
  worker.onmessage = (event: MessageEvent<EngineResponse>) => {
    const message = event.data
    const entry = pending.get(message.id)
    if (!entry) return
    pending.delete(message.id)
    if (message.ok) entry.resolve(message.result)
    else entry.reject(new Error(message.error ?? 'The local engine failed.'))
  }
  worker.onerror = (event) => {
    const error = new Error(event.message || 'The local engine failed to start.')
    initError = error
    failPending(error)
    worker?.terminate()
    worker = null
  }
  return worker
}

function request(type: RequestType, payload: Record<string, unknown>): Promise<unknown> {
  let target: Worker
  try {
    target = ensureWorker()
  } catch (error) {
    return Promise.reject(error)
  }
  const id = nextId++
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    target.postMessage({ id, type, payload })
  })
}

/** Run one battle over many seeds locally. */
export function runLocalSimulate(payload: Record<string, unknown>): Promise<unknown> {
  return request('simulate', payload)
}

/** Sweep one side's inf/lan/mar split locally. */
export function runLocalOptimizeRatio(payload: Record<string, unknown>): Promise<unknown> {
  return request('optimize', payload)
}

/** Stop the worker (used when the optimiser side changes). */
export function resetEngine(): void {
  worker?.terminate()
  worker = null
  initError = null
  failPending(new Error('The local engine was stopped.'))
}
