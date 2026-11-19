import { el } from './dom'

type DialogOptions = {
  title: string
  text?: string
  inputLabel?: string
  inputValue?: string
  confirmLabel?: string
  cancelLabel?: string | null
}

let resolver: ((value: string | boolean | null) => void) | null = null
let generation = 0

function closeWith(value: string | boolean | null): void {
  const dialog = el<HTMLDialogElement>('dialog')
  const resolve = resolver
  resolver = null
  generation += 1
  if (dialog.open) dialog.close()
  if (resolve) resolve(value)
}

export function openDialog(options: DialogOptions): Promise<string | boolean | null> {
  if (resolver) closeWith(null)

  const dialog = el<HTMLDialogElement>('dialog')
  if (dialog.open) dialog.close()

  el('dialog-title').textContent = options.title
  const text = el('dialog-text')
  text.textContent = options.text ?? ''
  text.hidden = !options.text

  const inputWrap = el('dialog-input-wrap')
  const input = el<HTMLInputElement>('dialog-input')
  inputWrap.hidden = options.inputLabel === undefined
  if (options.inputLabel !== undefined) {
    el('dialog-input-label').textContent = options.inputLabel
    input.value = options.inputValue ?? ''
  }

  const actions = el('dialog-actions')
  actions.replaceChildren()

  const cancelLabel = options.cancelLabel === undefined ? 'Cancel' : options.cancelLabel
  if (cancelLabel !== null) {
    const cancel = document.createElement('button')
    cancel.type = 'button'
    cancel.className = 'app-button'
    cancel.textContent = cancelLabel
    cancel.addEventListener('click', () => closeWith(null))
    actions.append(cancel)
  }

  const confirm = document.createElement('button')
  confirm.type = 'button'
  confirm.className = 'app-button app-button--primary'
  confirm.textContent = options.confirmLabel ?? 'OK'
  confirm.addEventListener('click', () => {
    if (options.inputLabel !== undefined) {
      const value = input.value.trim()
      if (!value) {
        input.focus()
        return
      }
      closeWith(value)
      return
    }
    closeWith(true)
  })
  actions.append(confirm)

  const promise = new Promise<string | boolean | null>((resolve) => {
    resolver = resolve
  })
  const current = ++generation
  dialog.addEventListener(
    'close',
    () => {
      if (current !== generation || !resolver) return
      const resolve = resolver
      resolver = null
      resolve(null)
    },
    { once: true },
  )

  dialog.showModal()
  if (options.inputLabel !== undefined) {
    input.focus()
    input.select()
  } else {
    confirm.focus()
  }
  return promise
}

export function showError(message: string): void {
  void openDialog({ title: 'WoS Util', text: message, confirmLabel: 'OK', cancelLabel: null })
}
