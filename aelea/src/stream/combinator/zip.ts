import { just } from '../source/just.js'
import { empty } from '../source/void.js'
import type { IScheduler, ISink, IStream, ITime } from '../types.js'
import { disposeAll, disposeNone } from '../utils/disposable.js'
import { invoke } from '../utils/function.js'
import { Queue } from '../utils/Queue.js'
import { map } from './map.js'

/**
 * Combine values from multiple streams into an object in lockstep
 *
 * x:   -1---2---3------>
 * y:   ---a---b---c---->
 * zip: ---A---B---C---->
 *   where A = { x: 1, y: a }
 *         B = { x: 2, y: b }
 *         C = { x: 3, y: c }
 */
export function zip<A>(
  state: {
    [P in keyof A]: IStream<A[P]>
  }
): IStream<Readonly<A>> {
  const keys = Object.keys(state) as (keyof A)[]

  if (keys.length === 0) return just({} as A)

  return new Zip(keys, Object.values(state) as IStream<any>[])
}

class Zip<A> implements IStream<Readonly<A>> {
  readonly zipMap: ZipMap<any[], Readonly<A>>

  constructor(keys: (keyof A)[], sources: IStream<any>[]) {
    this.zipMap = new ZipMap((...values: any[]) => {
      const result = {} as A
      for (let i = 0; i < keys.length; i++) {
        result[keys[i]] = values[i]
      }
      return result as Readonly<A>
    }, sources)
  }

  run(sink: ISink<Readonly<A>>, scheduler: IScheduler): Disposable {
    return this.zipMap.run(sink, scheduler)
  }
}

/**
 * Combine values from multiple streams in lockstep. Ends as soon as one
 * source has ended with nothing left to pair.
 *
 * streamA: -1---2---3------>
 * streamB: ---a---b---c---->
 * zipMap:  ---A---B---C---->
 *             |   |   |
 *             |   |   +-- [3,c]
 *             |   +-- [2,b]
 *             +-- [1,a]
 */
export function zipMap<T extends readonly unknown[], R>(
  f: (...args: T) => R,
  ...sourceList: [...{ [K in keyof T]: IStream<T[K]> }]
): IStream<R> {
  const l = sourceList.length

  if (l === 0) return empty
  if (l === 1) return map(f as any, sourceList[0])

  return new ZipMap(f, sourceList)
}

class ZipMap<T extends readonly unknown[], R> implements IStream<R> {
  constructor(
    readonly f: (...args: T) => R,
    readonly sources: [...{ [K in keyof T]: IStream<T[K]> }]
  ) {}

  run(sink: ISink<R>, scheduler: IScheduler): Disposable {
    const l = this.sources.length
    const disposables = new Array<Disposable>(l)
    const zipSink = new ZipMapSink(disposables, l, sink, this.f)

    for (let i = 0; i < l; i++) {
      if (zipSink.ended) {
        disposables[i] = disposeNone
        continue
      }
      const innerSink = new ZipInnerSink(zipSink, i)
      const d = this.sources[i].run(innerSink, scheduler)
      if (innerSink.ended || zipSink.ended) {
        d[Symbol.dispose]()
        disposables[i] = disposeNone
      } else {
        disposables[i] = d
      }
    }

    return disposeAll(disposables)
  }
}

class ZipMapSink<O> {
  readonly buffers: Queue<unknown>[]
  readonly values: unknown[]
  readonly sourceEnded: boolean[]
  ended = false

  constructor(
    readonly disposables: Disposable[],
    sinkCount: number,
    readonly sink: ISink<O>,
    readonly f: (...args: any[]) => O
  ) {
    this.buffers = new Array(sinkCount)
    this.values = new Array(sinkCount)
    this.sourceEnded = new Array(sinkCount)
    for (let i = 0; i < sinkCount; i++) {
      this.buffers[i] = new Queue()
      this.sourceEnded[i] = false
    }
  }

  set(time: ITime, i: number, value: unknown): void {
    if (this.ended) return
    const buffers = this.buffers
    const buffer = buffers[i]
    buffer.push(value)
    if (buffer.length() !== 1) return

    const l = buffers.length
    for (let j = 0; j < l; j++) {
      if (buffers[j].isEmpty()) return
    }
    for (let j = 0; j < l; j++) {
      this.values[j] = buffers[j].shift()
    }
    try {
      this.sink.event(time, invoke(this.f, this.values))
    } catch (error) {
      this.sink.error(time, error)
    }
    for (let j = 0; j < l; j++) {
      if (this.sourceEnded[j] && buffers[j].isEmpty()) {
        this.finish(time)
        return
      }
    }
  }

  endOne(time: ITime, i: number): void {
    if (this.ended) return
    this.release(i)
    this.sourceEnded[i] = true
    if (this.buffers[i].isEmpty()) this.finish(time)
  }

  release(i: number): void {
    const d = this.disposables[i]
    if (d !== undefined) {
      this.disposables[i] = disposeNone
      d[Symbol.dispose]()
    }
  }

  finish(time: ITime): void {
    this.ended = true
    for (let i = 0; i < this.disposables.length; i++) this.release(i)
    this.sink.end(time)
  }
}

class ZipInnerSink<I, O> implements ISink<I> {
  ended = false

  constructor(
    readonly parent: ZipMapSink<O>,
    readonly index: number
  ) {}

  event(time: ITime, value: I): void {
    this.parent.set(time, this.index, value)
  }

  error(time: ITime, e: unknown): void {
    if (!this.parent.ended) this.parent.sink.error(time, e)
  }

  end(time: ITime): void {
    this.ended = true
    this.parent.endOne(time, this.index)
  }
}
