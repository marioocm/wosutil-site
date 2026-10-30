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
  it('keeps a stored preference', () => {
    expect(resolveInitialTheme('light')).toBe('light')
    expect(resolveInitialTheme('dark')).toBe('dark')
  })

  it('defaults to dark when nothing valid is stored', () => {
    expect(resolveInitialTheme(null)).toBe('dark')
    expect(resolveInitialTheme('invalid')).toBe('dark')
  })
})

describe('toggleTheme', () => {
  it('switches between light and dark', () => {
    expect(toggleTheme('light')).toBe('dark')
    expect(toggleTheme('dark')).toBe('light')
  })
})
