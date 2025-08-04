import * as MC from '@most/core'
import * as MS from '@most/scheduler'
import { createDefaultScheduler, type IStream } from '../src/stream/index.js'

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

/**
 * Run an Aelea stream and capture the last emitted value
 */
export const runStream = <T>(stream: IStream<T>): Promise<T> => {
  let result: T
  return new Promise((resolve, reject) => {
    stream.run({
      event: (value) => {
        result = value
      },
      error: reject,
      end: () => resolve(result!)
    }, createDefaultScheduler())
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
