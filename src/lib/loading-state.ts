export interface LoadingElements {
  section: HTMLElement
  button: HTMLButtonElement
  label: HTMLElement
  spinner: HTMLElement
  progress: HTMLElement
  /** Verb shown while busy, e.g. "Simulating" or "Optimising". */
  busyLabel: string
}

export interface LoadingController {
  /** Enable or disable the busy UI; disabling restores the idle button label. */
  set(loading: boolean): void
  dispose(): void
}

/**
 * Shared busy state for the Simulate and Optimise Ratio cards.
 *
 * The request is a single blocking POST, so progress is intentionally
 * indeterminate; the live seconds counter proves the page is still working.
 */
export function createLoadingController({
  section,
  button,
  label,
  spinner,
  progress,
  busyLabel,
}: LoadingElements): LoadingController {
  const idleLabel = label.textContent?.trim() || busyLabel
  let timer: number | null = null
  let startedAt = 0

  function clearTimer(): void {
    if (timer === null) return
    window.clearInterval(timer)
    timer = null
  }

  function set(loading: boolean): void {
    clearTimer()
    button.disabled = loading
    spinner.hidden = !loading
    progress.hidden = !loading

    if (!loading) {
      section.removeAttribute('aria-busy')
      label.textContent = idleLabel
      return
    }

    startedAt = performance.now()
    section.setAttribute('aria-busy', 'true')
    const tick = (): void => {
      const elapsed = Math.max(0, Math.floor((performance.now() - startedAt) / 1000))
      label.textContent = `${busyLabel}… ${elapsed} s`
    }
    tick()
    timer = window.setInterval(tick, 500)
  }

  return {
    set,
    dispose: () => set(false),
  }
}
