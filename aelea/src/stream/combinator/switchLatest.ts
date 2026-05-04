import { fromPromise } from '../source/fromPromise.js'
import type { IScheduler, ISink, IStream, ITime } from '../types.js'
import { disposeBoth, disposeNone } from '../utils/disposable.js'
import { curry2 } from '../utils/function.js'
import { map } from './map.js'

/**
 * Stream that switches to the latest inner stream, disposing the previous one
 */
class SwitchLatest<T> implements IStream<T> {
  constructor(readonly source: IStream<IStream<T>>) {}

  run(sink: ISink<T>, scheduler: IScheduler): Disposable {
    const switchSink = new SwitchSink(sink, scheduler)
    return disposeBoth(switchSink, this.source.run(switchSink, scheduler))
  }
}

/**
 * Switch to the latest inner stream, disposing the previous one
 *
 * stream of streams: -A--B--C|
 *           A:       -a-b-c|
 *           B:          -d-e-f|
 *           C:             -g-h-i-j|
 * switchLatest:      -a-b-d-e-g-h-i-j|
 *
 * The output stream remains active as long as:
 * - The source stream (stream of streams) is still active, OR
 * - The latest inner stream is still active
 *
 * It only ends when both have ended.
 */
export const switchLatest = <T>(source: IStream<IStream<T>>): IStream<T> => new SwitchLatest(source)

/**
 * Map each value to a stream and switch to the latest one.
 *
 * stream:             -a----b----c->
 * switchMap(x => x$): -aa---bbb--ccc->
 *   where a$ = -a-a-|
 *         b$ = -b-b-b-|
 *         c$ = -c-c-c->
 */
export const switchMap: ISwitchMapCurry = curry2((cb, s) => {
  return switchLatest(
    map(cbParam => {
      const cbRes = cb(cbParam)
      // Inline isStream check: skips the function call and the slow `'in'`
      // operator from utils/common.isStream. `cbRes != null` excludes
      // null/undefined (whose property access would throw); `typeof .run`
      // excludes primitives (autoboxed access returns undefined) and
      // Promises (which expose `.then` but not `.run`).
      return cbRes != null && typeof (cbRes as { run?: unknown }).run === 'function'
        ? (cbRes as IStream<unknown>)
        : fromPromise(cbRes as Promise<unknown>)
    }, s)
  )
})

export type IStreamOrPromise<T> = IStream<T> | Promise<T>

export interface ISwitchMapCurry {
  <T, R>(cb: (t: T) => IStreamOrPromise<R>, s: IStream<T>): IStream<R>
  <T, R>(cb: (t: T) => IStreamOrPromise<R>): (s: IStream<T>) => IStream<R>
}

class SwitchSink<T> implements ISink<IStream<T>>, Disposable {
  sourceEnded = false
  innerActive = false
  innerDisposable: Disposable = disposeNone
  innerSink: InnerSink<T>

  constructor(
    readonly sink: ISink<T>,
    readonly scheduler: IScheduler
  ) {
    this.innerSink = new InnerSink(this, sink)
  }

  event(_time: ITime, inner: IStream<T>): void {
    this.disposeInner()
    this.innerActive = true
    const d = inner.run(this.innerSink, this.scheduler)
    if (this.innerActive) {
      this.innerDisposable = d
    } else {
      // Inner ended synchronously during run(); drop the returned handle.
      d[Symbol.dispose]()
    }
  }

  error(time: ITime, error: unknown): void {
    this.sink.error(time, error)
  }

  end(time: ITime): void {
    this.sourceEnded = true

    // Only end if no inner stream is active; otherwise ride inner until completion.
    if (!this.innerActive) this.sink.end(time)
  }

  [Symbol.dispose](): void {
    this.innerActive = false
    this.disposeInner()
  }

  disposeInner(): void {
    if (this.innerDisposable === disposeNone) return

    const d = this.innerDisposable
    this.innerDisposable = disposeNone
    d[Symbol.dispose]()
  }
}

class InnerSink<T> implements ISink<T> {
  constructor(
    readonly parent: SwitchSink<T>,
    readonly sink: ISink<T>
  ) {}

  event(time: ITime, value: T): void {
    this.sink.event(time, value)
  }

  error(time: ITime, error: unknown): void {
    this.sink.error(time, error)
  }

  end(time: ITime): void {
    this.parent.innerActive = false
    this.parent.innerDisposable = disposeNone
    // End the output only if the source stream has already ended
    if (this.parent.sourceEnded) {
      this.sink.end(time)
    }
  }
}
