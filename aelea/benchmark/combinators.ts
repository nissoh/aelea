import * as MC from '@most/core'
import { Bench } from 'tinybench'
import { combineMap, fromArray, merge, op, tap, zipMap } from '../src/stream/index.js'
import { fromArrayM, runMost, runStream } from './utils.js'

const bench = new Bench({ time: 100 })

const n = 100
const m = 100

// Create test data
const numbers = Array.from({ length: n }, (_, i) => i)
const arrays = Array.from({ length: n }, () => Array.from({ length: m }, (_, j) => j))

const sum = (x: number, y: number) => x + y
const add3 = (a: number, b: number, c: number) => a + b + c

bench
  // Merge benchmarks - @most/core
  .add(`@most/core merge 2 streams of ${n} numbers`, () => {
    const s1 = fromArrayM(numbers)
    const s2 = fromArrayM(numbers)
    return runMost(MC.merge(s1, s2))
  })
  // Merge benchmarks - Aelea
  .add(`@aelea merge 2 streams of ${n} numbers`, () => {
    const s1 = fromArray(numbers)
    const s2 = fromArray(numbers)
    return runStream(
      op(
        merge(s1, s2),
        tap((x: number) => x)
      )
    )
  })
  // Merge 5 streams - @most/core
  .add(`@most/core merge 5 streams of ${n} numbers`, () => {
    const streams = Array.from({ length: 5 }, () => fromArrayM(numbers))
    return runMost(MC.mergeArray(streams))
  })
  // Merge 5 streams - Aelea
  .add(`@aelea merge 5 streams of ${n} numbers`, () => {
    const streams = Array.from({ length: 5 }, () => fromArray(numbers))
    return runStream(
      op(
        merge(...streams),
        tap((x: number) => x)
      )
    )
  })
  // Combine benchmarks - @most/core
  .add(`@most/core combine 2 streams of ${n} numbers`, () => {
    const s1 = fromArrayM(numbers)
    const s2 = fromArrayM(numbers)
    return runMost(MC.combine(sum, s1, s2))
  })
  // Combine benchmarks - Aelea
  .add(`@aelea combine 2 streams of ${n} numbers`, () => {
    const s1 = fromArray(numbers)
    const s2 = fromArray(numbers)
    return runStream(
      op(
        combineMap(sum, s1, s2),
        tap((x: number) => x)
      )
    )
  })
  // Combine 3 streams - @most/core
  .add(`@most/core combine 3 streams of ${n} numbers`, () => {
    const s1 = fromArrayM(numbers)
    const s2 = fromArrayM(numbers)
    const s3 = fromArrayM(numbers)
    return runMost(MC.combine(add3, s1, s2, s3))
  })
  // Combine 3 streams - Aelea
  .add(`@aelea combine 3 streams of ${n} numbers`, () => {
    const s1 = fromArray(numbers)
    const s2 = fromArray(numbers)
    const s3 = fromArray(numbers)
    return runStream(
      op(
        combineMap(add3, s1, s2, s3),
        tap((x: number) => x)
      )
    )
  })
  // Zip benchmarks - @most/core
  .add(`@most/core zip 2 streams of ${n} numbers`, () => {
    const s1 = fromArrayM(numbers)
    const s2 = fromArrayM(numbers)
    return runMost(MC.zip(sum, s1, s2))
  })
  // Zip benchmarks - Aelea
  .add(`@aelea zip 2 streams of ${n} numbers`, () => {
    const s1 = fromArray(numbers)
    const s2 = fromArray(numbers)
    return runStream(
      op(
        zipMap(sum, s1, s2),
        tap((x: number) => x)
      )
    )
  })
  // Zip 3 streams - @most/core
  .add(`@most/core zip 3 streams of ${n} numbers`, () => {
    const s1 = fromArrayM(numbers)
    const s2 = fromArrayM(numbers)
    const s3 = fromArrayM(numbers)
    return runMost(MC.zip(add3, s1, s2, s3))
  })
  // Zip 3 streams - Aelea
  .add(`@aelea zip 3 streams of ${n} numbers`, () => {
    const s1 = fromArray(numbers)
    const s2 = fromArray(numbers)
    const s3 = fromArray(numbers)
    return runStream(
      op(
        zipMap(add3, s1, s2, s3),
        tap((x: number) => x)
      )
    )
  })

  // Nested stream benchmarks (more complex) - Aelea only
  .add(`@aelea merge nested: ${n} streams of ${m} numbers`, () => {
    const streams = arrays.map(arr => fromArray(arr))
    return runStream(
      op(
        merge(...streams),
        tap((x: number) => x)
      )
    )
  })
  .add(`@aelea combine nested: 3 streams of ${m} numbers`, () => {
    const streams = arrays.slice(0, 3).map(arr => fromArray(arr))
    return runStream(
      op(
        combineMap(add3, ...(streams as [any, any, any])),
        tap((x: number) => x)
      )
    )
  })
  .add(`@aelea zip nested: 3 streams of ${m} numbers`, () => {
    const streams = arrays.slice(0, 3).map(arr => fromArray(arr))
    return runStream(
      op(
        zipMap(add3, ...(streams as [any, any, any])),
        tap((x: number) => x)
      )
    )
  })

bench.addEventListener('error', console.error)

await bench.run()

console.table(bench.table())
