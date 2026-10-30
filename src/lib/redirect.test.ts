import { describe, expect, it } from 'vitest'
import { defaultRedirectPaths, isDefaultPage } from './redirect'

describe('defaultRedirectPaths', () => {
  it('returns the simulator path under the repository base for project-site paths', () => {
    expect(defaultRedirectPaths('/wosutil-site/error/')).toEqual([
      '/wosutil-site/error/simulator/',
      '/wosutil-site/simulator/',
      '/simulator/',
    ])
  })

  it('falls back to the root for root-level paths', () => {
    expect(defaultRedirectPaths('/error/')).toEqual(['/error/simulator/', '/simulator/'])
  })

  it('handles the site root itself', () => {
    expect(defaultRedirectPaths('/wosutil-site/')).toEqual(['/wosutil-site/simulator/', '/simulator/'])
  })

  it('walks up from deeply nested paths', () => {
    expect(defaultRedirectPaths('/wosutil-site/a/b/error/')).toEqual([
      '/wosutil-site/a/b/error/simulator/',
      '/wosutil-site/a/b/simulator/',
      '/wosutil-site/a/simulator/',
      '/wosutil-site/simulator/',
      '/simulator/',
    ])
  })

  it('returns the root simulator path for an empty pathname', () => {
    expect(defaultRedirectPaths('')).toEqual(['/simulator/'])
  })

  it('does not produce protocol-relative URLs', () => {
    expect(defaultRedirectPaths('/')).toEqual(['/simulator/'])
  })
})

describe('isDefaultPage', () => {
  it('detects the simulator page marker', () => {
    expect(isDefaultPage('<main id="simulator">.</main>')).toBe(true)
  })

  it('rejects pages without the marker', () => {
    expect(isDefaultPage('<title>WoS Util</title>')).toBe(false)
    expect(isDefaultPage('')).toBe(false)
  })
})
