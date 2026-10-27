import { describe, expect, it } from 'vitest'
import { frameDimensions, frameSizeIdFor } from './frameSizeMapping'

const options = [
  { id: 'Mini (3x3 in)', label: 'Mini (3x3 in)' },
  { id: '4x6 in', label: '4x6 in' },
]

describe('frame design size mapping', () => {
  it('matches the existing frame gallery description to a manual size', () => {
    expect(frameSizeIdFor({ title: 'Mini Size Frame', description: 'Mini Size Frame 3×3 Inch' }, options)).toBe('Mini (3x3 in)')
  })

  it('matches reversed dimensions and prefers an explicit valid mapping', () => {
    expect(frameDimensions('Landscape frame 6x4 inches')).toBe('4x6')
    expect(frameSizeIdFor({ title: 'Another title 3x3', sizeId: '4x6 in' }, options)).toBe('4x6 in')
  })

  it('leaves ambiguous or unrecognized galleries unmapped', () => {
    expect(frameSizeIdFor({ title: 'Custom frame' }, options)).toBe('')
    expect(frameSizeIdFor({ title: 'Frame 3x3' }, [...options, { id: '3x3 square', label: '3x3 square' }])).toBe('')
  })
})
