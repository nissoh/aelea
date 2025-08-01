import { Bench } from 'tinybench'

const bench = new Bench({ time: 500 })

// Test cancellation performance
bench
  .add('queueMicrotask + cancel flag', () => {
    let disposed = false
    let completed = 0
    
    for (let i = 0; i < 1000; i++) {
      queueMicrotask(() => {
        if (!disposed) completed++
      })
    }
    
    // Cancel half way
    if (Math.random() > 0.5) disposed = true
    
    return new Promise(resolve => setTimeout(() => resolve(completed), 10))
  })
  .add('Promise.then (no cancellation)', () => {
    let completed = 0
    
    for (let i = 0; i < 1000; i++) {
      Promise.resolve().then(() => {
        completed++
      })
    }
    
    return new Promise(resolve => setTimeout(() => resolve(completed), 10))
  })
  .add('AbortController + fetch pattern', () => {
    let completed = 0
    const controller = new AbortController()
    
    for (let i = 0; i < 1000; i++) {
      Promise.resolve().then(() => {
        if (!controller.signal.aborted) completed++
      })
    }
    
    // Cancel half way
    if (Math.random() > 0.5) controller.abort()
    
    return new Promise(resolve => setTimeout(() => resolve(completed), 10))
  })

console.log('Scheduler Cancellation Test')
console.log('===========================\n')

await bench.run()

console.table(bench.table())

// Let's also test memory implications
console.log('\nMemory Test: Creating disposable vs non-disposable tasks')
console.log('=========================================================\n')

const memBefore = process.memoryUsage()

// Test 1: Disposable pattern
const disposables: Array<{ [Symbol.dispose]: () => void }> = []
for (let i = 0; i < 100000; i++) {
  let disposed = false
  disposables.push({
    [Symbol.dispose]: () => { disposed = true }
  })
}

const memAfterDisposable = process.memoryUsage()

// Test 2: Promise pattern (no disposal)
const promises: Promise<void>[] = []
for (let i = 0; i < 100000; i++) {
  promises.push(Promise.resolve())
}

const memAfterPromise = process.memoryUsage()

console.log('Memory usage:')
console.log('- Disposable pattern:', Math.round((memAfterDisposable.heapUsed - memBefore.heapUsed) / 1024), 'KB')
console.log('- Promise pattern:', Math.round((memAfterPromise.heapUsed - memAfterDisposable.heapUsed) / 1024), 'KB')