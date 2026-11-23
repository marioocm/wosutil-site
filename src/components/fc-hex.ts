const FC_HEX_CLASS = 'troop-fc-hex'
const FC_VALUE_CLASS = 'troop-fc-value'

export const FC_ANY_LABEL = 'Any'

function fcLabel(value: number | null): string {
  return value === null ? FC_ANY_LABEL : String(value)
}

/**
 * Markup for the shared FC hexagon.
 *
 * The simulator (Astro), the archive detail tiles and the tier/FC filters all
 * render this same badge; `null` shows `Any` with the same inverted fill.
 */
export function fcHexMarkup(value: number | null): string {
  const any = value === null ? ' is-any' : ''
  return `<span class="${FC_HEX_CLASS}${any}" aria-hidden="true"><span class="${FC_VALUE_CLASS}" data-troop-fc-value>${fcLabel(value)}</span></span>`
}

export interface FcHex {
  readonly element: HTMLSpanElement
  setValue(value: number | null): void
}

/** DOM version of {@link fcHexMarkup} for client-rendered controls. */
export function createFcHex(value: number | null): FcHex {
  const element = document.createElement('span')
  element.setAttribute('aria-hidden', 'true')

  const label = document.createElement('span')
  label.className = FC_VALUE_CLASS
  label.dataset['troopFcValue'] = ''
  element.append(label)

  function setValue(next: number | null): void {
    element.className = next === null ? `${FC_HEX_CLASS} is-any` : FC_HEX_CLASS
    label.textContent = fcLabel(next)
  }

  setValue(value)
  return { element, setValue }
}
