import { describe, expect, it } from 'vitest'
import { countdownRedirectPaths, isCountdownPage } from './redirect'

describe('countdownRedirectPaths', () => {
  it('returns the countdown path under the repository base for project-site paths', () => {
    expect(countdownRedirectPaths('/wosutil-site/error/')).toEqual([
      '/wosutil-site/error/countdown/',
      '/wosutil-site/countdown/',
      '/countdown/',
    ])
  })

  it('falls back to the root for root-level paths', () => {
    expect(countdownRedirectPaths('/error/')).toEqual(['/error/countdown/', '/countdown/'])
  })

  it('handles the site root itself', () => {
    expect(countdownRedirectPaths('/wosutil-site/')).toEqual(['/wosutil-site/countdown/', '/countdown/'])
  })

  it('walks up from deeply nested paths', () => {
    expect(countdownRedirectPaths('/wosutil-site/a/b/error/')).toEqual([
      '/wosutil-site/a/b/error/countdown/',
      '/wosutil-site/a/b/countdown/',
      '/wosutil-site/a/countdown/',
      '/wosutil-site/countdown/',
      '/countdown/',
    ])
  })

  it('returns the root countdown path for an empty pathname', () => {
    expect(countdownRedirectPaths('')).toEqual(['/countdown/'])
  })

  it('does not produce protocol-relative URLs', () => {
    expect(countdownRedirectPaths('/')).toEqual(['/countdown/'])
  })
})

describe('isCountdownPage', () => {
  it('detects the countdown page marker', () => {
    expect(isCountdownPage('<div id="utc-clock">UTC: 12:00:00</div>')).toBe(true)
  })

  it('rejects pages without the marker', () => {
    expect(isCountdownPage('<title>WoS Util</title>')).toBe(false)
    expect(isCountdownPage('')).toBe(false)
  })
})