import type { ISink } from '../stream/index.js'

export function tryEvent<T>(sink: ISink<T>, value: T): void {
  try {
    sink.event(value)
  } catch (e) {
    // Sink error - isolated to that sink
  }
}

export function tryError(sink: ISink<unknown>, error: unknown): void {
  try {
    sink.error(error as Error)
  } catch (e) {
    // Sink error - isolated to that sink
  }
}

export function tryEnd(sink: ISink<unknown>): void {
  try {
    sink.end()
  } catch (e) {
    // Sink error - isolated to that sink
  }
}
