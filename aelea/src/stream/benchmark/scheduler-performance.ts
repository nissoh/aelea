import { Bench } from 'tinybench'
import { op, runPromise, scan, tap } from '../index.js'

const bench = new Bench({ time: 100 })

// Test with different batch sizes
const batchSizes = [100, 1000, 10000]

for (const n of batchSizes) {
  // setImmediate (Node.js/Bun)
  if (typeof setImmediate !== 'undefined') {
    bench.add(`setImmediate (${n} events)`, async () => {
      let result = 0
      const s = IStream<number>(
        (env, sink) =>
          setImmediate(() => {
            for (let i = 0; i < n; i++) sink.event(i)
            sink.end()
          }) as unknown as Disposable
      )
      await runPromise({ setImmediate })(
        op(
          s,
          scan((a, b) => a + b, 0),
          tap((x) => (result = x))
        )
      )
      return result
    })
  }

  // queueMicrotask (most modern environments)
  if (typeof queueMicrotask !== 'undefined') {
    bench.add(`queueMicrotask (${n} events)`, async () => {
      let result = 0
      const s = IStream<number>((env, sink) => {
        queueMicrotask(() => {
          for (let i = 0; i < n; i++) sink.event(i)
          sink.end()
        })
        return { [Symbol.dispose]: () => {} }
      })
      await runPromise({ queueMicrotask })(
        op(
          s,
          scan((a, b) => a + b, 0),
          tap((x) => (result = x))
        )
      )
      return result
    })
  }

  // Promise.resolve().then()
  bench.add(`Promise.then (${n} events)`, async () => {
    let result = 0
    const s = IStream<number>((env, sink) => {
      Promise.resolve().then(() => {
        for (let i = 0; i < n; i++) sink.event(i)
        sink.end()
      })
      return { [Symbol.dispose]: () => {} }
    })
    await runPromise({})(
      op(
        s,
        scan((a, b) => a + b, 0),
        tap((x) => (result = x))
      )
    )
    return result
  })

  // setTimeout(0)
  bench.add(`setTimeout(0) (${n} events)`, async () => {
    let result = 0
    const s = IStream<number>(
      (env, sink) =>
        setTimeout(() => {
          for (let i = 0; i < n; i++) sink.event(i)
          sink.end()
        }, 0) as unknown as Disposable
    )
    await runPromise({ setTimeout })(
      op(
        s,
        scan((a, b) => a + b, 0),
        tap((x) => (result = x))
      )
    )
    return result
  })

  // Synchronous baseline
  bench.add(`sync baseline (${n} events)`, async () => {
    let result = 0
    const s = IStream<number>((env, sink) => {
      for (let i = 0; i < n; i++) sink.event(i)
      sink.end()
      return { [Symbol.dispose]: () => {} }
    })
    await runPromise({})(
      op(
        s,
        scan((a, b) => a + b, 0),
        tap((x) => (result = x))
      )
    )
    return result
  })
}

console.log('Scheduler Performance Comparison')
console.log('================================\n')

await bench.run()

console.table(bench.table())
