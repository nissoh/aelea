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

export type IBehavior<A, B = A> = [IStream<B>, IComposeBehavior<A, B>]

export interface IComposeBehavior<I, O> {
  (): IOps<I, I>
  (o1: IOps<I, O>): IOps<I, I>
  <O1>(o1: IOps<I, O1>, o2: IOps<O1, O>): IOps<I, I>
  <O1, O2>(o1: IOps<I, O1>, o2: IOps<O1, O2>, o3: IOps<O2, O>): IOps<I, I>
  <O1, O2, O3>(o1: IOps<I, O1>, o2: IOps<O1, O2>, o3: IOps<O2, O3>, o4: IOps<O3, O>): IOps<I, I>
  <B1, B2, B3, B4>(o1: IOps<I, B1>, o2: IOps<B1, B2>, o3: IOps<B2, B3>, o4: IOps<B3, B4>, o5: IOps<B4, O>): IOps<I, I>
  <B1, B2, B3, B4, B5>(
    o1: IOps<I, B1>,
    o2: IOps<B1, B2>,
    o3: IOps<B2, B3>,
    o4: IOps<B3, B4>,
    o5: IOps<B5, O>
  ): IOps<I, I>
  <B1, B2, B3, B4, B5, B6>(
    o1: IOps<I, B1>,
    o2: IOps<B1, B2>,
    o3: IOps<B2, B3>,
    o4: IOps<B3, B4>,
    o5: IOps<B5, B6>,
    ...oos: IOps<unknown, O>[]
  ): IOps<I, I>
}
