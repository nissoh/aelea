import * as MC from '@most/core'
import * as MS from '@most/scheduler'
import { Bench } from 'tinybench'
import { createDefaultScheduler, filter, fromArray, map, op, scan, tap } from '../src/stream/index.js'

const bench = new Bench({ time: 100 })

const n = 1000000

const arr = Array.from({ length: n }, (_, i) => i)

const add1 = (x: number) => x + 1
const even = (x: number) => x % 2 === 0
const sum = (x: number, y: number) => {
  // console.log(x, y)
  return x + y
}

// Removed - now using imported fromArray

const fromArrayM = <A>(arr: readonly A[]) =>
  MC.newStream<A>((sink, s) =>
    MS.asap(
      {
        run(t) {
          for (const a of arr) sink.event(t, a)
          sink.end(t)
        },
        error(t, e) {
          sink.error(t, e)
        },
        dispose() {}
      },
      s
    )
  )

bench
  .add(`mc1 map-filter-reduce ${n}`, () => {
    let r = 0
    const s0 = MC.scan(sum, 0, MC.filter(even, MC.map(add1, fromArrayM(arr))))
    const s = MC.tap((x) => (r = x), s0)
    return MC.runEffects(s, MS.newDefaultScheduler()).then(() => r)
  })
  .add(`mc2 map-filter-reduce ${n}`, () => {
    let r = 0
    const newLocal = op(
      fromArray(arr),
      map(add1),
      filter(even),
      scan(sum, 0),
      tap((x: number) => {
        r = x
      })
    )
    return new Promise((resolve) => {
      newLocal.run(createDefaultScheduler(), {
        event: () => {},
        error: (e) => {
          throw e
        },
        end: () => resolve(r)
      })
    })
  })

await bench.run()

console.table(bench.table())
