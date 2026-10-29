import { describe, expect, it } from 'vitest'
import { isTheme, resolveInitialTheme, toggleTheme } from './theme'

describe('isTheme', () => {
  it('accepts the supported themes', () => {
    expect(isTheme('light')).toBe(true)
    expect(isTheme('dark')).toBe(true)
  })

  it('rejects anything else', () => {
    expect(isTheme('auto')).toBe(false)
    expect(isTheme(null)).toBe(false)
  })
})

describe('resolveInitialTheme', () => {
  it('prefers a stored preference over the system setting', () => {
    expect(resolveInitialTheme('light', true)).toBe('light')
    expect(resolveInitialTheme('dark', false)).toBe('dark')
  })

  it('follows the system setting when nothing is stored', () => {
    expect(resolveInitialTheme(null, true)).toBe('dark')
    expect(resolveInitialTheme(null, false)).toBe('light')
    expect(resolveInitialTheme('invalid', true)).toBe('dark')
  })
})

describe('toggleTheme', () => {
  it('switches between light and dark', () => {
    expect(toggleTheme('light')).toBe('dark')
    expect(toggleTheme('dark')).toBe('light')
  })
})
