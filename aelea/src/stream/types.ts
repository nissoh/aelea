export interface Disposable {
  [Symbol.dispose](): void
}

export type IStream<T, S = Scheduler> = (scheduler: S, sink: Sink<T>) => Disposable

export interface Sink<T> {
  event(value: T): void
  error(error: any): void
  end(): void
}

export type Fn<T, R> = (a: T) => R

export type U2I<U> = (U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never

export interface Scheduler {
  setTimeout: typeof setTimeout
  setInterval: typeof setInterval
  setImmediate: typeof setImmediate
}

export type Env = Scheduler & Record<string, unknown>
