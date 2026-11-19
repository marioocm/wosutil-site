export function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id)
  if (!node) throw new Error(`Missing #${id}`)
  return node as T
}

export function setConnection(label: string, state: 'connecting' | 'live' | 'error'): void {
  const node = el('connection')
  node.textContent = label
  node.dataset['state'] = state
}
