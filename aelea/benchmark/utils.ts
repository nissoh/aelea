import * as MC from '@most/core'
import * as MS from '@most/scheduler'
import { createDefaultScheduler, type ISink, type IStream } from '../src/stream/index.js'

// Create schedulers ONCE and reuse
const aeleaScheduler = createDefaultScheduler()
const mostScheduler = MS.newDefaultScheduler()

/**
 * @most/core helper to create streams from arrays
 */
export const fromArrayM = <A>(arr: readonly A[]) =>
  MC.newStream<A>((sink, s) =>
    MS.asap(
      {
        run(t) {
          for (const a of arr) sink.event(t, a)
          sink.end(t)
        },
        error(t, e) {
          sink.error(t, e)
        },
        dispose() {}
      },
      s
    )
  )

// Optimized sink - reusable
class RunStreamSink implements ISink<any> {
  result: any
  resolve!: (value: any) => void
  reject!: (error: any) => void

  reset(resolve: (value: any) => void, reject: (error: any) => void) {
    this.result = undefined
    this.resolve = resolve
    this.reject = reject
  }

  event(time: number, value: any): void {
    this.result = value
  }

  error(time: number, error: any): void {
    this.reject(error)
  }

  end(time: number): void {
    this.resolve(this.result)
  }
}

// Reuse sink instance
const reusableSink = new RunStreamSink()

/**
 * Run an Aelea stream with reused scheduler and sink
 */
export const runStream = <T>(stream: IStream<T>): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    reusableSink.reset(resolve, reject)
    stream.run(reusableSink, aeleaScheduler)
  })
}

/**
 * Run a @most/core stream with reused scheduler
 */
export const runMost = <T>(stream: any): Promise<T> => {
  let result: T
  const captured = MC.tap((x: T) => {
    result = x
  }, stream)
  return MC.runEffects(captured, mostScheduler).then(() => result!)
}
