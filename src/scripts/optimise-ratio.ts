export function initOptimiseRatio(): void {
  const section = document.querySelector<HTMLElement>('[data-optimise-ratio]')
  const toggle = section?.querySelector<HTMLElement>('[data-optimise-toggle]')
  if (!toggle) return

  const radios = [
    ...toggle.querySelectorAll<HTMLInputElement>('input[name="optimise-ratio-side"]'),
  ]
  if (radios.length === 0) return

  function checkedRadio(): HTMLInputElement | null {
    return radios.find((radio) => radio.checked) ?? null
  }

  const show = (radio: HTMLInputElement | null): void => {
    const side = radio?.value ?? checkedRadio()?.value ?? radios[0]?.value
    if (side === undefined) return
    toggle.dataset['side'] = side
  }

  toggle.addEventListener('change', () => show(null))

  show(null)
}
