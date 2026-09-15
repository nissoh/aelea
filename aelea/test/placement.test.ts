// placeFloating: the side is chosen by fit, content is capped to the room on
// its side so it scrolls instead of leaving the viewport, and top is clamped.
// Pure numbers, because the test DOM has no layout.

import { describe, expect, test } from 'bun:test'
import { placeFloating } from '../src/ui-components/utils/popover.js'

const GAP = 10
const anchorAt = (top: number, height = 28, left = 500, width = 100) => ({ top, bottom: top + height, left, width })

describe('placeFloating', () => {
  test('content taller than either side is capped to the larger side and stays inside the viewport', () => {
    // A 700px editor under an anchor ending at y=520 in a 1180px window: the
    // old placement ran its bottom 50px off the viewport with no way to scroll.
    const p = placeFloating(anchorAt(492), { naturalHeight: 700, width: 400 }, { width: 1400, height: 1180 }, GAP)
    expect(p).toEqual({ side: 'below', top: 530, maxHeight: 640, left: 350 })
    expect(p.top + Math.min(700, p.maxHeight)).toBeLessThanOrEqual(1180 - GAP)
  })

  test('content that fits below goes below, one gap under the anchor', () => {
    const p = placeFloating(anchorAt(100), { naturalHeight: 300, width: 200 }, { width: 1000, height: 800 }, GAP)
    expect(p.side).toBe('below')
    expect(p.top).toBe(128 + GAP)
    expect(p.maxHeight).toBe(800 - 128 - 2 * GAP)
  })

  test('content that does not fit below but fits above goes above, one gap over the anchor', () => {
    const p = placeFloating(anchorAt(1072), { naturalHeight: 400, width: 200 }, { width: 1000, height: 1180 }, GAP)
    expect(p.side).toBe('above')
    expect(p.top + 400).toBe(1072 - GAP)
  })

  test('fit wins over raw space: a low anchor still opens below when the content fits there', () => {
    // More room above (700) than below (260), but 200px fits below.
    const p = placeFloating(anchorAt(720, 20), { naturalHeight: 200, width: 200 }, { width: 1000, height: 1000 }, GAP)
    expect(p.side).toBe('below')
    expect(p.top).toBe(740 + GAP)
  })

  test('the above placement never produces a negative top', () => {
    const p = placeFloating(anchorAt(400, 30), { naturalHeight: 900, width: 200 }, { width: 1000, height: 700 }, GAP)
    expect(p.side).toBe('above')
    expect(p.maxHeight).toBe(400 - 2 * GAP)
    expect(p.top).toBe(GAP)
  })

  test('a viewport too short for either side still leaves a usable, visible cap', () => {
    const p = placeFloating(anchorAt(90, 20), { naturalHeight: 500, width: 200 }, { width: 400, height: 200 }, GAP)
    expect(p.maxHeight).toBe(120)
    expect(p.top).toBeGreaterThanOrEqual(GAP)
    expect(p.top + p.maxHeight).toBeLessThanOrEqual(200 - GAP)
  })

  test('left is clamped to the viewport on both edges', () => {
    const viewport = { width: 1000, height: 800 }
    const nearRight = placeFloating(
      { top: 100, bottom: 128, left: 960, width: 40 },
      { naturalHeight: 100, width: 300 },
      viewport,
      GAP
    )
    expect(nearRight.left).toBe(1000 - 300 - GAP)
    const nearLeft = placeFloating(
      { top: 100, bottom: 128, left: 0, width: 40 },
      { naturalHeight: 100, width: 300 },
      viewport,
      GAP
    )
    expect(nearLeft.left).toBe(GAP)
  })
})
