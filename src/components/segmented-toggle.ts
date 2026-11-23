export type SegmentedToggleSize = 'default' | 'compact'

export interface SegmentedToggleOption<T extends string> {
  value: T
  label: string
}

export interface SegmentedToggleOptions<T extends string> {
  /** Radio group name; must be unique on the page. */
  name: string
  /** Accessible label for the group, rendered as a visually hidden legend. */
  label: string
  options: readonly SegmentedToggleOption<T>[]
  value: T
  size?: SegmentedToggleSize
  className?: string
  onChange?: (value: T) => void
}

export interface SegmentedToggle<T extends string> {
  readonly element: HTMLFieldSetElement
  readonly value: T
  setValue(value: T, silent?: boolean): void
}

const BASE_CLASS =
  'relative m-0 grid min-w-0 select-none rounded-sm border border-line bg-background p-0.5'
const THUMB_CLASS =
  'pointer-events-none absolute bottom-0.5 left-0.5 top-0.5 rounded-xs bg-invert transition-transform duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none'
const LABEL_CLASS = 'relative z-10 min-w-0 cursor-pointer'
const OPTION_CLASS: Record<SegmentedToggleSize, string> = {
  default:
    'flex h-full min-w-0 items-center justify-center rounded-xs px-2 py-1 text-center text-micro leading-none text-ink-muted transition-colors peer-checked:text-invert-fg peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink',
  compact:
    'flex h-full min-w-0 items-center justify-center rounded-xs px-1 py-1 text-center text-[10px] leading-none text-ink-muted transition-colors peer-checked:text-invert-fg peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink',
}

/**
 * Builds a native radio segmented control with a sliding thumb.
 *
 * The same component backs the report mode filter, the hero/joiner side
 * toggle and the simulator's attacker/defender switch.
 */
export function createSegmentedToggle<T extends string>(
  options: SegmentedToggleOptions<T>,
): SegmentedToggle<T> {
  if (options.options.length === 0) {
    throw new Error('A segmented toggle needs at least one option')
  }

  const fieldset = document.createElement('fieldset')
  fieldset.className = [BASE_CLASS, options.className ?? ''].filter(Boolean).join(' ')
  fieldset.style.gridTemplateColumns = `repeat(${options.options.length}, minmax(0, 1fr))`

  const legend = document.createElement('legend')
  legend.className = 'sr-only'
  legend.textContent = options.label

  const thumb = document.createElement('span')
  thumb.className = THUMB_CLASS
  thumb.setAttribute('aria-hidden', 'true')
  thumb.style.width = `calc((100% - 0.25rem) / ${options.options.length})`

  fieldset.append(legend, thumb)

  let current = options.value
  const inputs: HTMLInputElement[] = []

  function sync(silent: boolean): void {
    const index = options.options.findIndex((option) => option.value === current)
    const selected = index === -1 ? 0 : index
    inputs.forEach((input, position) => {
      input.checked = position === selected
    })
    thumb.style.transform = `translateX(${selected * 100}%)`
    if (!silent) options.onChange?.(current)
  }

  for (const option of options.options) {
    const label = document.createElement('label')
    label.className = LABEL_CLASS

    const input = document.createElement('input')
    input.type = 'radio'
    input.name = options.name
    input.value = option.value
    input.className = 'peer sr-only'
    input.checked = option.value === options.value

    const text = document.createElement('span')
    text.className = OPTION_CLASS[options.size ?? 'default']
    text.textContent = option.label

    label.append(input, text)
    fieldset.append(label)
    inputs.push(input)
  }

  sync(true)

  fieldset.addEventListener('change', (event) => {
    if (!(event.target instanceof HTMLInputElement) || event.target.type !== 'radio') return
    current = event.target.value as T
    sync(false)
  })

  return {
    element: fieldset,
    get value() {
      return current
    },
    setValue(value: T, silent = false): void {
      if (!options.options.some((option) => option.value === value)) return
      current = value
      sync(silent)
    },
  }
}
