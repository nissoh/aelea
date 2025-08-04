import { Bench } from 'tinybench'
import { combine, createDefaultScheduler, type IStream, merge, stream, zip } from '../src/stream/index.js'

// Create a stream that emits values with controlled timing
function createControlledStream(values: number[], delayMs = 0): IStream<number> {
  return stream((sink, scheduler) => {
    let index = 0
    let disposed = false

    const emitNext = () => {
      if (disposed || index >= values.length) {
        if (!disposed) sink.end()
        return
      }

      sink.event(values[index++])

      if (delayMs > 0) {
        scheduler.delay(emitNext, delayMs)
      } else {
        scheduler.asap(emitNext)
      }
    }

    if (delayMs > 0) {
      scheduler.delay(emitNext, delayMs)
    } else {
      scheduler.asap(emitNext)
    }

    return {
      [Symbol.dispose]: () => {
        disposed = true
      }
    }
  })
}

// Helper to run stream and measure time
async function measureStreamTime<T>(stream: IStream<T>): Promise<{ time: number; count: number }> {
  const start = performance.now()
  let count = 0

  return new Promise((resolve) => {
    const scheduler = createDefaultScheduler()
    stream.run({
      event: () => {
        count++
      },
      error: (e) => {
        throw e
      },
      end: () => {
        const time = performance.now() - start
        resolve({ time, count })
      }
    }, scheduler)
  })
}

console.log('Running combinator characteristic benchmarks...\n')

const bench = new Bench({
  warmupIterations: 50,
  iterations: 100,
  time: 3000
})

// Test 1: Event ordering and interleaving
console.log('=== Test 1: Event Ordering ===')

// Merge should interleave events
const mergeOrderTest = async () => {
  const s1 = createControlledStream([1, 3, 5])
  const s2 = createControlledStream([2, 4, 6])
  const merged = merge(s1, s2)

  const events: number[] = []
  const scheduler = createDefaultScheduler()

  return new Promise<void>((resolve) => {
    merged.run({
      event: (v) => events.push(v),
      error: (e) => {
        throw e
      },
      end: () => {
        console.log('Merge order:', events) // Should interleave
        resolve()
      }
    }, scheduler)
  })
}

// Combine should emit when all have values
const combineOrderTest = async () => {
  const s1 = createControlledStream([1, 2, 3])
  const s2 = createControlledStream([10, 20, 30])
  const combined = combine((a, b) => [a, b], s1, s2)

  const events: [number, number][] = []
  const scheduler = createDefaultScheduler()

  return new Promise<void>((resolve) => {
    combined.run({
      event: (v) => events.push(v),
      error: (e) => {
        throw e
      },
      end: () => {
        console.log('Combine order:', events) // Should be [[1,10], [2,20], [3,30]]
        resolve()
      }
    }, scheduler)
  })
}

// Zip should pair up values
const zipOrderTest = async () => {
  const s1 = createControlledStream([1, 2, 3, 4, 5])
  const s2 = createControlledStream([10, 20, 30]) // Shorter stream
  const zipped = zip((a, b) => [a, b], s1, s2)

  const events: [number, number][] = []
  const scheduler = createDefaultScheduler()

  return new Promise<void>((resolve) => {
    zipped.run({
      event: (v) => events.push(v),
      error: (e) => {
        throw e
      },
      end: () => {
        console.log('Zip order:', events) // Should be [[1,10], [2,20], [3,30]] then end
        resolve()
      }
    }, scheduler)
  })
}

await mergeOrderTest()
await combineOrderTest()
await zipOrderTest()

console.log('\n=== Test 2: Performance Characteristics ===\n')

// Benchmark different scenarios
bench
  // Merge: All events flow through immediately
  .add('merge - immediate throughput', async () => {
    const streams = Array.from({ length: 10 }, (_, i) =>
      createControlledStream(Array.from({ length: 100 }, (_, j) => i * 100 + j))
    )
    await measureStreamTime(merge(...streams))
  })

  // Combine: Must wait for all streams to emit
  .add('combine - synchronization overhead', async () => {
    const streams = Array.from({ length: 10 }, (_, i) =>
      createControlledStream(Array.from({ length: 100 }, (_, j) => i * 100 + j))
    )
    await measureStreamTime(combine((...args) => args.reduce((a, b) => a + b, 0), ...streams))
  })

  // Zip: Buffers values until all streams have emitted
  .add('zip - buffering overhead', async () => {
    const streams = Array.from({ length: 10 }, (_, i) =>
      createControlledStream(Array.from({ length: 100 }, (_, j) => i * 100 + j))
    )
    await measureStreamTime(zip((...args) => args.reduce((a, b) => a + b, 0), ...streams))
  })

// Test with asymmetric streams (different emission rates)
bench
  .add('merge - asymmetric streams', async () => {
    const fast = createControlledStream(Array.from({ length: 1000 }, (_, i) => i))
    const slow = createControlledStream(
      Array.from({ length: 10 }, (_, i) => i * 1000),
      1
    )
    await measureStreamTime(merge(fast, slow))
  })

  .add('combine - asymmetric streams', async () => {
    const fast = createControlledStream(Array.from({ length: 1000 }, (_, i) => i))
    const slow = createControlledStream(
      Array.from({ length: 10 }, (_, i) => i * 1000),
      1
    )
    await measureStreamTime(combine((a, b) => a + b, fast, slow))
  })

  .add('zip - asymmetric streams', async () => {
    const fast = createControlledStream(Array.from({ length: 1000 }, (_, i) => i))
    const slow = createControlledStream(
      Array.from({ length: 10 }, (_, i) => i * 1000),
      1
    )
    await measureStreamTime(zip((a, b) => a + b, fast, slow))
  })

// Test early termination behavior
bench
  .add('merge - early termination', async () => {
    const streams = Array.from({ length: 10 }, (_, i) =>
      createControlledStream(Array.from({ length: i === 0 ? 10 : 1000 }, (_, j) => j))
    )
    await measureStreamTime(merge(...streams))
  })

  .add('combine - early termination', async () => {
    const streams = Array.from({ length: 10 }, (_, i) =>
      createControlledStream(Array.from({ length: i === 0 ? 10 : 1000 }, (_, j) => j))
    )
    await measureStreamTime(combine((...args) => args.reduce((a, b) => a + b, 0), ...streams))
  })

  .add('zip - early termination', async () => {
    const streams = Array.from({ length: 10 }, (_, i) =>
      createControlledStream(Array.from({ length: i === 0 ? 10 : 1000 }, (_, j) => j))
    )
    await measureStreamTime(zip((...args) => args.reduce((a, b) => a + b, 0), ...streams))
  })

await bench.run()

console.table(
  bench.tasks.map((task) => ({
    Test: task.name,
    'Ops/sec': Math.round(task.result!.hz).toLocaleString(),
    'Avg time (ms)': (task.result!.mean * 1000).toFixed(3),
    'Min time (ms)': (task.result!.min * 1000).toFixed(3),
    'Max time (ms)': (task.result!.max * 1000).toFixed(3)
  }))
)

console.log('\n=== Test 3: Memory Characteristics ===\n')

// Test memory usage patterns
if (global.gc) {
  // Merge: Minimal memory overhead
  global.gc()
  const beforeMerge = process.memoryUsage()
  const mergeStreams = Array.from({ length: 100 }, () =>
    createControlledStream(Array.from({ length: 1000 }, (_, i) => i))
  )
  const merged = merge(...mergeStreams)
  const afterMerge = process.memoryUsage()
  console.log('Merge memory (100 streams × 1000 values):')
  console.log(`  Setup: ${((afterMerge.heapUsed - beforeMerge.heapUsed) / 1024 / 1024).toFixed(2)} MB`)

  // Combine: Stores values array
  global.gc()
  const beforeCombine = process.memoryUsage()
  const combineStreams = Array.from({ length: 100 }, () =>
    createControlledStream(Array.from({ length: 1000 }, (_, i) => i))
  )
  const combined = combine((...args) => args.reduce((a, b) => a + b), ...combineStreams)
  const afterCombine = process.memoryUsage()
  console.log('\nCombine memory (100 streams × 1000 values):')
  console.log(`  Setup: ${((afterCombine.heapUsed - beforeCombine.heapUsed) / 1024 / 1024).toFixed(2)} MB`)

  // Zip: Buffers values in queues
  global.gc()
  const beforeZip = process.memoryUsage()
  const zipStreams = Array.from({ length: 100 }, () =>
    createControlledStream(Array.from({ length: 1000 }, (_, i) => i))
  )
  const zipped = zip((...args) => args.reduce((a, b) => a + b), ...zipStreams)
  const afterZip = process.memoryUsage()
  console.log('\nZip memory (100 streams × 1000 values):')
  console.log(`  Setup: ${((afterZip.heapUsed - beforeZip.heapUsed) / 1024 / 1024).toFixed(2)} MB`)
}

console.log('\n=== Key Characteristics Summary ===\n')
console.log('MERGE:')
console.log('  - Interleaves events from all sources')
console.log('  - Minimal memory overhead')
console.log('  - Best throughput for independent streams')
console.log('  - Ends when all sources end')

console.log('\nCOMBINE:')
console.log('  - Waits for all sources to emit before emitting')
console.log('  - Stores latest value from each source')
console.log('  - Synchronization overhead')
console.log('  - Emits whenever any source emits (after all have emitted once)')

console.log('\nZIP:')
console.log('  - Pairs up values from all sources')
console.log('  - Buffers values until all sources have a value')
console.log('  - Higher memory usage with asymmetric streams')
console.log('  - Ends when any source ends')
