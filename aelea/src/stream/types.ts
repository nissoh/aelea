export interface Disposable {
  [Symbol.dispose](): void
}

export interface IStream<T> {
  run<S extends Scheduler>(scheduler: S, sink: Sink<T>): Disposable
}

export interface Sink<T> {
  event(value: T): void
  error(error: any): void
  end(): void
}

export interface Scheduler {
  schedule: (callback: () => void, delay: number) => Disposable
  currentTime: () => number
}

export type Fn<T, R> = (a: T) => R

export type IOps<I, O = I> = Fn<IStream<I>, IStream<O>>
