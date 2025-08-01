import * as MC from '@most/core'
import * as MS from '@most/scheduler'
import { Bench } from 'tinybench'
import { fromArray, map, op, runStream, scan, switchLatest, tap } from '../src/stream/index.js'
import { batchedScheduler, syncScheduler } from './scheduler-batched.js'

const bench = new Bench({ time: 100 })

const n = 1000
const m = 1000

const arr = Array.from({ length: n }, () => Array.from({ length: m }, (_, j) => j))

const sum = (x: number, y: number) => {
  // console.log(x, y)
  return x + y
}

// Removed custom fromArray - using the imported one

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
  .add(`@most/core switch ${n} x ${m}`, () => {
    let r = 0
    const s0 = MC.scan(sum, 0, MC.switchLatest(MC.map(fromArrayM, fromArrayM(arr))))
    const s = MC.tap((x) => (r = x), s0)
    return MC.runEffects(s, MS.newDefaultScheduler()).then(() => r)
  })
  .add(`@aelea (sync) switch ${n} x ${m}`, () => {
    let r = 0
    const pipeline = op(
      fromArray(arr),
      map((arr: readonly number[]) => fromArray(arr)),
      switchLatest,
      scan(sum, 0),
      tap((x) => (r = x))
    )
    return new Promise((resolve) => {
      runStream(syncScheduler, {
        event: () => {},
        error: (e) => {
          throw e
        },
        end: () => resolve(r)
      })(pipeline)
    })
  })
  .add(`@aelea (batched) switch ${n} x ${m}`, () => {
    let r = 0
    const pipeline = op(
      fromArray(arr),
      map((arr: readonly number[]) => fromArray(arr)),
      switchLatest,
      scan(sum, 0),
      tap((x) => (r = x))
    )
    return new Promise((resolve) => {
      runStream(batchedScheduler, {
        event: () => {},
        error: (e) => {
          throw e
        },
        end: () => resolve(r)
      })(pipeline)
    })
  })

bench.addEventListener('error', console.error)

await bench.run()

console.table(bench.table())
