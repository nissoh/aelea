import * as MC from '@most/core'
import { Bench } from 'tinybench'
import { fromArray, map, op, reduce, switchLatest } from '../src/stream/index.js'
import { fromArrayM, runMost, runStream } from './utils.js'

const bench = new Bench({ time: 100 })

const n = 1000
const m = 1000

const arr = Array.from({ length: n }, () => Array.from({ length: m }, (_, j) => j))
const sum = (x: number, y: number) => x + y

bench
  .add(`@most/core switch ${n} x ${m}`, () => {
    const stream = MC.scan(sum, 0, MC.switchLatest(MC.map(fromArrayM, fromArrayM(arr))))
    return runMost(stream)
  })
  .add(`@aelea switch ${n} x ${m}`, () => {
    return op(
      fromArray(arr), //
      map(fromArray),
      switchLatest,
      reduce(sum, 0),
      runStream
    )
  })

bench.addEventListener('error', console.error)

await bench.run()

console.table(bench.table())
