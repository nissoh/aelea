import { Stream, Disposable, Sink, Scheduler } from '@most/types';
import { Behavior, Op, StateBehavior } from '../types';
export declare class BehaviorSource<A, B> implements Stream<A> {
    queuedSamplers: Stream<A>[];
    sinks: Map<Sink<A>, Map<Stream<A>, Disposable | null>>;
    scheduler: Scheduler | undefined;
    run(sink: Sink<A>, scheduler: Scheduler): Disposable;
    disposeSampler(sink: Sink<A>): void;
    protected runBehavior(sink: Sink<A>, x: Stream<A>): Disposable;
    sample: (...ops: Op<B, A>[]) => (sb: Stream<B>) => Stream<B>;
}
export declare function behavior<A, B>(): Behavior<A, B>;
export declare function state<A, B>(initialState: B): StateBehavior<A, B>;
export declare function replayLatest<A>(s: Stream<A>, initialState?: A): ReplayLatest<A>;
export declare class ReplayLatest<A> implements Stream<A> {
    private source;
    private initialState?;
    latestvalue: A;
    hasValue: boolean;
    hasInitial: boolean;
    constructor(source: Stream<A>, initialState?: A | undefined);
    run(sink: Sink<A>, scheduler: Scheduler): Disposable;
}
//# sourceMappingURL=behavior.d.ts.map