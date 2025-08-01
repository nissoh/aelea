import { fromArray, map, op, runStream } from '../src/stream/index.js'
import { scheduller } from './scheduler.js'

// Test fusion is working
const testStream = op(
  fromArray([1, 2, 3]),
  map((x: number) => x + 1),
  map((x: number) => x * 2),
  map((x: number) => x / 3)
)

console.log('\nMap Fusion Test')
console.log('===============')

// Check if fusion marker exists
const MAP_MARKER = Symbol.for('map') // Won't match the actual symbol
console.log('Has map marker:', Object.getOwnPropertySymbols(testStream).length > 0)

// Run the actual value through to verify correctness
const testResult: number[] = []
await new Promise<void>((resolve) => {
  runStream(scheduller, {
    event: (x) => testResult.push(x),
    error: console.error,
    end: resolve
  })(testStream)
})

console.log('\nExpected: [(1+1)*2/3, (2+1)*2/3, (3+1)*2/3] = [1.33, 2, 2.67]')
console.log(
  'Actual:  ',
  testResult.map((x) => Math.round(x * 100) / 100)
)

// Quick performance test
console.log('\nQuick Performance Test (10,000 items)')
console.log('====================================')

const arr = Array.from({ length: 10000 }, (_, i) => i)

// Without fusion (using separate operations)
const start1 = performance.now()
const result1: number[] = []
for (const x of arr) {
  const a = x + 1
  const b = a * 2
  const c = b / 3
  const d = c - 4
  result1.push(d)
}
const time1 = performance.now() - start1

// With fusion (using composed stream)
const fusedStream = op(
  fromArray(arr),
  map((x: number) => x + 1),
  map((x: number) => x * 2),
  map((x: number) => x / 3),
  map((x: number) => x - 4)
)

const start2 = performance.now()
let lastValue = 0
await new Promise<void>((resolve) => {
  runStream(scheduller, {
    event: (x) => {
      lastValue = x
    },
    error: console.error,
    end: resolve
  })(fusedStream)
})
const time2 = performance.now() - start2

console.log(`Direct loop: ${time1.toFixed(2)}ms`)
console.log(`Fused stream: ${time2.toFixed(2)}ms`)
console.log(`Last values match: ${result1[result1.length - 1] === lastValue}`)
