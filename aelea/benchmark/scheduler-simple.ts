import { Bench } from 'tinybench'

const bench = new Bench({ time: 500 })
const iterations = 100000

// Test raw scheduling performance
bench
  .add('setImmediate', () => {
    return new Promise((resolve) => {
      setImmediate(() => resolve(undefined))
    })
  })
  .add('queueMicrotask', () => {
    return new Promise((resolve) => {
      queueMicrotask(() => resolve(undefined))
    })
  })
  .add('Promise.resolve().then', () => {
    return Promise.resolve().then(() => {})
  })
  .add('setTimeout(0)', () => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(undefined), 0)
    })
  })

// Test with work
bench
  .add('setImmediate + work', () => {
    return new Promise((resolve) => {
      setImmediate(() => {
        let sum = 0
        for (let i = 0; i < iterations; i++) sum += i
        resolve(sum)
      })
    })
  })
  .add('queueMicrotask + work', () => {
    return new Promise((resolve) => {
      queueMicrotask(() => {
        let sum = 0
        for (let i = 0; i < iterations; i++) sum += i
        resolve(sum)
      })
    })
  })
  .add('Promise.then + work', () => {
    return Promise.resolve().then(() => {
      let sum = 0
      for (let i = 0; i < iterations; i++) sum += i
      return sum
    })
  })
  .add('setTimeout(0) + work', () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let sum = 0
        for (let i = 0; i < iterations; i++) sum += i
        resolve(sum)
      }, 0)
    })
  })

console.log('Scheduler Performance Test')
console.log('==========================\n')

await bench.run()

console.table(bench.table())
