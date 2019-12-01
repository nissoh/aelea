import { Stream } from '@most/types'
export declare type Event<T> = {
  time: number;
  value: T;
}
export declare const pipe: <A, B, C>(a: (a: A) => B, b: (b: B) => C) => (x: A) => C
export declare const run: <T>(s: Stream<T>) => Promise<void>
export declare function collectEvents<T> (stream: Stream<T>): Promise<Event<T>[]>
export interface CollectNCurry {
  <T>(n: number, stream: Stream<T>): Promise<Event<T>[]>
  <T>(n: number): (stream: Stream<T>) => Promise<Event<T>[]>
}
export declare const collectN: CollectNCurry
export declare const collectOne: <T>(s: Stream<T>) => Promise<T>
