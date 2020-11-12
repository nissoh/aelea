import { Stream, Disposable, Scheduler, Sink, Time } from '@most/types';
import { Pipe } from '../utils';
declare class SourceSink<A> implements Sink<A> {
    private parent;
    private sink;
    hasValue: boolean;
    value: A;
    constructor(parent: Tether<A>, sink: Sink<A>);
    event(t: number, x: A): void;
    end(t: Time): void;
    error(t: Time, e: Error): void;
}
declare class TetherSink<A> extends Pipe<A, A> {
    constructor(sink: Sink<A>);
    event(t: number, x: A): void;
}
export declare class Tether<A> implements Stream<A> {
    private source;
    sourceSink: SourceSink<A> | null;
    tetherSink: TetherSink<A>[];
    constructor(source: Stream<A>);
    run(sink: SourceSink<A> | TetherSink<A>, scheduler: Scheduler): Disposable;
}
export declare const tether: <A>(source: Stream<A>) => [Stream<A>, Stream<A>];
export {};
//# sourceMappingURL=tether.d.ts.map