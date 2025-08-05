import * as MC from '@most/core'
import { Bench } from 'tinybench'
import { aggregate, fromArray, op } from '../src/stream/index.js'
import { fromArrayM, runMost, runStream } from './utils.js'

const bench = new Bench({ time: 100 })

const n = 1000000
const arr = Array.from({ length: n }, (_, i) => i)

const sum = (x: number, y: number) => x + y

bench
  .add(`@most/core scan ${n}`, () => {
    const stream = MC.scan(sum, 0, fromArrayM(arr))
    return runMost(stream)
  })
  .add(`@aelea scan ${n}`, () => {
    return runStream(op(fromArray(arr), aggregate(sum, 0)))
  })

await bench.run()

console.table(bench.table())
