import type { ISink, ITime } from '../types.js'

export abstract class PipeSink<I, O = I> implements ISink<I> {
  constructor(readonly sink: ISink<O>) {}

  abstract event(time: ITime, value: I): void

  error(time: ITime, e: unknown): void {
    this.sink.error(time, e)
  }

  end(time: ITime): void {
    this.sink.end(time)
  }
}

export interface IndexedValue<A> {
  readonly index: number
  readonly value: A
  readonly ended: boolean
}

export class IndexSink<A> implements ISink<A> {
  // Fields assigned in the constructor body so the emit defines a packed
  // hidden class on first construction, instead of the per-field Object.
  // defineProperty path triggered by class-field declarations under
  // useDefineForClassFields. Hot path for combine/zip/merge subscription.
  readonly sink: ISink<IndexedValue<A | undefined>>
  index: number
  ended: boolean
  value: A | undefined

  constructor(sink: ISink<IndexedValue<A | undefined>>, index: number) {
    this.sink = sink
    this.index = index
    this.ended = false
    this.value = undefined
  }

  event(time: ITime, x: A): void {
    if (this.ended) {
      this.sink.error(time, new Error('Cannot send events to ended sink'))
      return
    }

    this.value = x
    this.sink.event(time, this)
  }

  end(time: ITime): void {
    if (this.ended) {
      this.sink.error(time, new Error('Cannot end an ended sink'))
      return
    }

    this.ended = true
    this.sink.event(time, this)
  }

  error(time: ITime, error: unknown): void {
    this.sink.error(time, error)
  }
}
