import * as MC from '@most/core'
import * as MS from '@most/scheduler'
import { Bench } from 'tinybench'
import { fromArray, op, runStream, scan, tap } from '../src/stream/index.js'
import { scheduller } from './scheduler.js'

const bench = new Bench({ time: 100 })

const n = 1000000

const arr = Array.from({ length: n }, (_, i) => i)

const sum = (x: number, y: number) => {
  // console.log(x, y)
  return x + y
}

// Remove custom fromArray - using the imported one

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
  .add(`mc1 scan ${n}`, () => {
    let r = 0
    const s0 = MC.scan(sum, 0, fromArrayM(arr))
    const s = MC.tap((x) => (r = x), s0)
    return MC.runEffects(s, MS.newDefaultScheduler()).then(() => r)
  })
  .add(`mc2 scan ${n}`, () => {
    let r = 0
    return new Promise((resolve) => {
      runStream(scheduller, {
        event: () => {},
        error: (e) => {
          throw e
        },
        end: () => resolve(r)
      })(
        op(
          fromArray(arr),
          scan(sum, 0),
          tap((x) => (r = x))
        )
      )
    })
  })

await bench.run()

console.table(bench.table())
