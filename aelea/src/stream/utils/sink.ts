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

export function tryEvent<T>(sink: ISink<T>, time: ITime, value: T): void {
  try {
    sink.event(time, value)
  } catch (error) {
    sink.error(time, error)
  }
}

export function tryError(sink: ISink<unknown>, time: ITime, error: unknown): void {
  try {
    sink.error(time, error)
  } catch (fault) {
    reportUncaught(fault)
  }
}

export function tryEnd(sink: ISink<unknown>, time: ITime): void {
  try {
    sink.end(time)
  } catch (fault) {
    reportUncaught(fault)
  }
}

export function reportUncaught(error: unknown): void {
  if (typeof reportError === 'function') {
    reportError(error)
    return
  }
  queueMicrotask(() => {
    throw error
  })
}
