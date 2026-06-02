// Guards the DomScheduler paint-phase cascade drain (Phase 4): paint tasks
// scheduled from inside a paint flush apply within the same frame, and a
// runaway self-rescheduling paint is bounded per frame yet still completes.

import { describe, expect, test } from 'bun:test'
import type { ITask } from '../src/stream/index.js'
import { createDomScheduler } from '../src/ui/index.js'

function paintTask(run: (time: number) => void): ITask {
  return { active: true, run, error() {}, [Symbol.dispose]() {} }
}

const wait = (ms: number) => new Promise(r => setTimeout(r, ms))

describe('DomScheduler paint cascade', () => {
  test('paints scheduled during a flush run in the same frame', async () => {
    const s = createDomScheduler()
    const order: number[] = []
    const times: number[] = []
    const N = 10
    const chain = (i: number): ITask =>
      paintTask(time => {
        order.push(i)
        times.push(time)
        if (i + 1 < N) s.paint(chain(i + 1))
      })
    s.paint(chain(0))
    await wait(80)
    expect(order).toEqual(Array.from({ length: N }, (_, i) => i))
    // same-frame: the whole cascade drained within one flush, so the spread of
    // observed times is far below a frame (~16ms).
    expect(Math.max(...times) - Math.min(...times)).toBeLessThan(8)
  })

  test('runaway paint rescheduling is bounded per frame but completes', async () => {
    const s = createDomScheduler()
    let count = 0
    const target = 250 // > PAINT_DRAIN_GUARD (100)
    const self: ITask = {
      active: true,
      run() {
        count++
        if (count < target) s.paint(self)
      },
      error() {},
      [Symbol.dispose]() {}
    }
    s.paint(self)
    await wait(150)
    expect(count).toBe(target)
  })
})
