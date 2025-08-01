export interface IStream<T> {
  run<S extends Scheduler>(scheduler: S, sink: Sink<T>): Disposable
}

export interface Sink<T> {
  event(value: T): void
  error(error: any): void
  end(): void
}

export interface Scheduler {
  delay: <TArgs extends readonly unknown[], T>(
    sink: Sink<T>,
    callback: (sink: Sink<T>, ...args: TArgs) => void,
    delay: number,
    ...args: TArgs
  ) => Disposable
  asap: <TArgs extends readonly unknown[], T>(
    sink: Sink<T>,
    callback: (sink: Sink<T>, ...args: TArgs) => void,
    ...args: TArgs
  ) => Disposable
  time: () => number
}

export type Fn<T, R> = (a: T) => R

export type IOps<I, O = I> = Fn<IStream<I>, IStream<O>>
