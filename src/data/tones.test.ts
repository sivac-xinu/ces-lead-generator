import { describe, expect, it } from 'vitest'
import { TONES } from './tones'

describe('TONES', () => {
  it('contains all tone keys', () => {
    expect(Object.keys(TONES).sort()).toEqual([
      'challenger',
      'consultative',
      'empathetic',
      'executive',
      'technical',
    ])
  })

  it('has script sections for each tone', () => {
    Object.values(TONES).forEach((tone) => {
      expect(tone.scripts.hook).toBeDefined()
      expect(tone.scripts.pain).toBeDefined()
      expect(tone.scripts.value).toBeDefined()
      expect(tone.scripts.objection).toBeDefined()
      expect(tone.scripts.cta).toBeDefined()
    })
  })
})
