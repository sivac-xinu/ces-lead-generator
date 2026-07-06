import type { ToneKey } from '@/types'
import { describe, expect, it } from 'vitest'
import { OBJECTIONS } from './objections'

const TONE_KEYS: ToneKey[] = ['consultative', 'empathetic', 'challenger', 'executive', 'technical']

describe('OBJECTIONS', () => {
  it('contains common objections', () => {
    expect(OBJECTIONS.length).toBeGreaterThan(0)
    expect(OBJECTIONS[0].q).toBeDefined()
  })

  it('has a response for every tone', () => {
    OBJECTIONS.forEach((obj) => {
      TONE_KEYS.forEach((key) => {
        expect(obj.responses[key]).toBeDefined()
      })
    })
  })
})
