import * as MC from '@most/core'
import { filter, fromIterable, map, op, reduce } from '../../src/stream/index.js'
import { fromArrayM, runMost, runStream } from '../lib/runtime.js'
import { type ISuite, runAndPrint } from '../lib/suite.js'

const n = 1_000_000
const arr = Array.from({ length: n }, (_, i) => i)

const add1 = (x: number) => x + 1
const even = (x: number) => x % 2 === 0
const sum = (x: number, y: number) => x + y

const suite: ISuite = {
  title: 'map · filter · reduce',
  subtitle: `${n.toLocaleString()} elements`,
  options: { time: 500, warmupTime: 250 },
  tasks: [
    {
      group: '',
      variant: '@most/core',
      baseline: true,
      fn: () => runMost(MC.scan(sum, 0, MC.filter(even, MC.map(add1, fromArrayM(arr)))))
    },
    {
      group: '',
      variant: '@aelea',
      fn: () => runStream(op(fromIterable(arr), map(add1), filter(even), reduce(sum, 0)))
    }
  ]
}

export default suite

if (import.meta.main) await runAndPrint(suite)
