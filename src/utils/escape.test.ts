import { describe, expect, it } from 'vitest'
import { escapeHtml, escapeJsStr } from './escape'

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    )
  })

  it('returns empty string for null or undefined', () => {
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(undefined)).toBe('')
  })

  it('converts numbers to string', () => {
    expect(escapeHtml(42)).toBe('42')
  })
})

describe('escapeJsStr', () => {
  it('escapes quotes and backslashes', () => {
    expect(escapeJsStr("It's a 'test'")).toBe("It\\'s a \\'test\\'")
  })

  it('escapes newlines', () => {
    expect(escapeJsStr('line1\nline2')).toBe('line1\\nline2')
  })

  it('returns empty string for null or undefined', () => {
    expect(escapeJsStr(null)).toBe('')
    expect(escapeJsStr(undefined)).toBe('')
  })
})
