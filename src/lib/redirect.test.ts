import { describe, expect, it } from 'vitest'
import { defaultRedirectPaths, isDefaultPage } from './redirect'

describe('defaultRedirectPaths', () => {
  it('returns the reports path under the repository base for project-site paths', () => {
    expect(defaultRedirectPaths('/wosutil-site/error/')).toEqual([
      '/wosutil-site/error/reports/',
      '/wosutil-site/reports/',
      '/reports/',
    ])
  })

  it('falls back to the root for root-level paths', () => {
    expect(defaultRedirectPaths('/error/')).toEqual(['/error/reports/', '/reports/'])
  })

  it('handles the site root itself', () => {
    expect(defaultRedirectPaths('/wosutil-site/')).toEqual(['/wosutil-site/reports/', '/reports/'])
  })

  it('walks up from deeply nested paths', () => {
    expect(defaultRedirectPaths('/wosutil-site/a/b/error/')).toEqual([
      '/wosutil-site/a/b/error/reports/',
      '/wosutil-site/a/b/reports/',
      '/wosutil-site/a/reports/',
      '/wosutil-site/reports/',
      '/reports/',
    ])
  })

  it('returns the root reports path for an empty pathname', () => {
    expect(defaultRedirectPaths('')).toEqual(['/reports/'])
  })

  it('does not produce protocol-relative URLs', () => {
    expect(defaultRedirectPaths('/')).toEqual(['/reports/'])
  })
})

describe('isDefaultPage', () => {
  it('detects the reports page marker', () => {
    expect(isDefaultPage('<main id="reports">.</main>')).toBe(true)
  })

  it('rejects pages without the marker', () => {
    expect(isDefaultPage('<title>WoS Util</title>')).toBe(false)
    expect(isDefaultPage('')).toBe(false)
  })
})
