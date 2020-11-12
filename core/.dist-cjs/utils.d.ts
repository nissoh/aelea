import { Sink, Disposable, Time, Stream } from '@most/types';
import { Op } from './types';
declare type Fn<T, R> = (a: T) => R;
export declare const xForver: <T>(x: T) => Stream<T>;
export declare function MaybeOp<A, B, C>(a: Op<A, B>, b?: Op<B, C>): Op<A, B> | ((x: Stream<A>) => Stream<C>);
export declare function isStream(s: unknown): s is Stream<unknown>;
export declare function isFunction(s: unknown): s is Op<unknown, unknown>;
export declare function isEmpty(s: Stream<unknown>): boolean;
export declare abstract class Pipe<A, B> implements Sink<A> {
    protected readonly sink: Sink<B>;
    constructor(sink: Sink<B>);
    abstract event(t: Time, x: A): void;
    end(t: Time): void;
    error(t: Time, e: Error): void;
}
export declare const nullSink: Sink<unknown>;
export declare const nullDisposable: Disposable;
export declare function O<T>(): Fn<T, T>;
export declare function O<T, A>(fn1: Fn<T, A>): Fn<T, A>;
export declare function O<T, A, B>(fn1: Fn<T, A>, fn2: Fn<A, B>): Fn<T, B>;
export declare function O<T, A, B, C>(fn1: Fn<T, A>, fn2: Fn<A, B>, fn3: Fn<B, C>): Fn<T, C>;
export declare function O<T, A, B, C, D>(fn1: Fn<T, A>, fn2: Fn<A, B>, fn3: Fn<B, C>, fn4: Fn<C, D>): Fn<T, D>;
export declare function O<T, A, B, C, D, E>(fn1: Fn<T, A>, fn2: Fn<A, B>, fn3: Fn<B, C>, fn4: Fn<C, D>, fn5: Fn<D, E>): Fn<T, E>;
export declare function O<T, A, B, C, D, E, F>(fn1: Fn<T, A>, fn2: Fn<A, B>, fn3: Fn<B, C>, fn4: Fn<C, D>, fn5: Fn<D, E>, fn6: Fn<E, F>): Fn<T, F>;
export declare function O<T, A, B, C, D, E, F, G>(fn1: Fn<T, A>, fn2: Fn<A, B>, fn3: Fn<B, C>, fn4: Fn<C, D>, fn5: Fn<D, E>, fn6: Fn<E, F>, fn7: Fn<F, G>): Fn<T, G>;
export declare function O<T, A, B, C, D, E, F, G, H>(fn1: Fn<T, A>, fn2: Fn<A, B>, fn3: Fn<B, C>, fn4: Fn<C, D>, fn5: Fn<D, E>, fn6: Fn<E, F>, fn7: Fn<F, G>, fn8: Fn<G, H>): Fn<T, H>;
export declare function O<T, A, B, C, D, E, F, G, H, I>(fn1: Fn<T, A>, fn2: Fn<A, B>, fn3: Fn<B, C>, fn4: Fn<C, D>, fn5: Fn<D, E>, fn6: Fn<E, F>, fn7: Fn<F, G>, fn8: Fn<G, H>, ...fn9: Fn<unknown, I>[]): Fn<T, I>;
export {};
//# sourceMappingURL=utils.d.ts.map