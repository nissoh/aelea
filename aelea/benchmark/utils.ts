import * as MC from '@most/core'
import * as MS from '@most/scheduler'
import { createDefaultScheduler, type ISink, type IStream } from '../src/stream/index.js'

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

// Optimized sink implementation for running streams
class RunStreamSink<T> implements ISink<T> {
  result: T | undefined

  constructor(
    private resolve: (value: T) => void,
    private reject: (error: any) => void
  ) {}

  event(value: T): void {
    this.result = value
  }

  error(error: any): void {
    this.reject(error)
  }

  end(): void {
    this.resolve(this.result!)
  }
}

/**
 * Run an Aelea stream and capture the last emitted value
 */
export const runStream = <T>(stream: IStream<T>): Promise<T> => {
  return new Promise((resolve, reject) => {
    stream.run(new RunStreamSink(resolve, reject), createDefaultScheduler())
  })
}

/**
 * Run a @most/core stream and capture the last emitted value
 */
export const runMost = <T>(stream: any): Promise<T> => {
  let result: T
  const captured = MC.tap((x: T) => {
    result = x
  }, stream)
  return MC.runEffects(captured, MS.newDefaultScheduler()).then(() => result!)
}
