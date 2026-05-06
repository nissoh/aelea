import * as MC from '@most/core'
import { fromIterable, map, op, reduce, switchLatest } from '../../src/stream/index.js'
import { fromArrayM, runMost, runStream } from '../lib/runtime.js'
import { type ISuite, runAndPrint } from '../lib/suite.js'

const n = 1000
const m = 1000

const arr = Array.from({ length: n }, () => Array.from({ length: m }, (_, j) => j))
const sum = (x: number, y: number) => x + y

const suite: ISuite = {
  title: 'switchLatest',
  subtitle: `${n}×${m} (outer × inner)`,
  options: { time: 500, warmupTime: 250 },
  tasks: [
    {
      group: '',
      variant: '@most/core',
      baseline: true,
      fn: () => runMost(MC.scan(sum, 0, MC.switchLatest(MC.map(fromArrayM, fromArrayM(arr)))))
    },
    {
      group: '',
      variant: '@aelea',
      fn: () => runStream(op(fromIterable(arr), map(fromIterable), switchLatest, reduce(sum, 0)))
    }
  ]
}

export default suite

if (import.meta.main) await runAndPrint(suite)
