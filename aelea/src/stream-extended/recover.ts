import { at, constant, continueWith, curry2, type IStream, switchLatest } from '../stream/index.js'

export interface IRecoverConfig<T> {
  /** Minimum interval between retries, in ms. Default 10 seconds. */
  recoverTime?: number
  /** Optional transform applied to the source before re-running, given the
   *  delay until the next attempt fires. Useful e.g. to re-create a fetch
   *  with backoff-aware metadata. */
  recoverWith?: (source: IStream<T>, delayMs: number) => IStream<T>
  /** Internal: timestamp (scheduler time) of the last attempt. Set
   *  automatically on recursion; callers should leave this unset. */
  lastRuntime?: number
}

export interface IRecoverCurry {
  <A>(config: IRecoverConfig<A>, s: IStream<A>): IStream<A>
  <A>(config: IRecoverConfig<A>): (s: IStream<A>) => IStream<A>
}

/**
 * On stream end, re-subscribe to the source — but throttle so attempts are
 * spaced at least `recoverTime` ms apart. If the previous run lasted longer
 * than `recoverTime`, the next attempt fires immediately; otherwise it is
 * deferred via `at()` so the scheduler holds the gap.
 *
 * source:                 -a-b|
 * recover({recoverTime}): -a-b- ... wait ... -a-b- ...
 */
export const recover: IRecoverCurry = curry2(<A>(config: IRecoverConfig<A>, source: IStream<A>) => {
  const { recoverTime = 10_000, recoverWith, lastRuntime } = config

  return continueWith((time): IStream<A> => {
    const timeElapsed = time - (lastRuntime ?? 0)
    const delayMs = Math.max(0, recoverTime - timeElapsed)
    const recoveredSource = recoverWith ? recoverWith(source, delayMs) : source
    const nextRuntime = time + delayMs
    const wrappedSource = recover({ lastRuntime: nextRuntime, recoverTime, recoverWith }, recoveredSource)
    return delayMs > 0 ? switchLatest(constant(wrappedSource, at(nextRuntime))) : wrappedSource
  }, source)
})
