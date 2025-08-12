import * as MC from '@most/core'
import { Bench } from 'tinybench'
import { filter, fromArray, map, op, reduce } from '../src/stream/index.js'
import { fromArrayM, runMost, runStream } from './utils.js'

const bench = new Bench({ time: 100 })

const n = 1000000
const arr = Array.from({ length: n }, (_, i) => i)

const add1 = (x: number) => x + 1
const even = (x: number) => x % 2 === 0
const sum = (x: number, y: number) => x + y

bench
  .add(`@most/core map-filter-reduce ${n}`, () => {
    const stream = MC.scan(sum, 0, MC.filter(even, MC.map(add1, fromArrayM(arr))))
    return runMost(stream)
  })
  .add(`@aelea map-filter-reduce ${n}`, () => {
    return runStream(op(fromArray(arr), map(add1), filter(even), reduce(sum, 0)))
  })

await bench.run()

console.table(bench.table())
