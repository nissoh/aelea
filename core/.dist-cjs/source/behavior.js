"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplayLatest = exports.replayLatest = exports.state = exports.behavior = exports.BehaviorSource = void 0;
const disposable_1 = require("@most/disposable");
const utils_1 = require("../utils");
const core_1 = require("@most/core");
const tether_1 = require("../combinators/tether");
class BehaviorSource {
    constructor() {
        this.queuedSamplers = [];
        this.sinks = new Map();
        this.sample = (...ops) => {
            return (sb) => {
                const [source, tetherSource] = tether_1.tether(sb);
                // @ts-ignore
                const bops = ops.length ? utils_1.O(...ops)(tetherSource) : tetherSource;
                this.queuedSamplers.push(bops);
                this.sinks.forEach((sourcesMap, sink) => {
                    sourcesMap.set(bops, this.runBehavior(sink, bops));
                });
                return source;
            };
        };
    }
    run(sink, scheduler) {
        this.scheduler = scheduler;
        const sourcesMap = new Map();
        this.sinks.set(sink, sourcesMap);
        this.queuedSamplers.forEach(s => {
            sourcesMap.set(s, this.runBehavior(sink, s));
        });
        return disposable_1.disposeWith((s) => {
            console.log(s);
            this.disposeSampler(s);
        }, sink);
    }
    disposeSampler(sink) {
        var _a;
        (_a = this.sinks.get(sink)) === null || _a === void 0 ? void 0 : _a.forEach(x => x === null || x === void 0 ? void 0 : x.dispose());
        this.sinks.delete(sink);
    }
    runBehavior(sink, x) {
        return x.run(sink, this.scheduler);
    }
}
exports.BehaviorSource = BehaviorSource;
function behavior() {
    const ss = new BehaviorSource();
    return [ss.sample, ss];
}
exports.behavior = behavior;
function state(initialState) {
    const ss = new BehaviorSource();
    return [ss.sample, replayLatest(ss, initialState)];
}
exports.state = state;
class StateSink extends utils_1.Pipe {
    constructor(parent, sink) {
        super(sink);
        this.parent = parent;
        this.sink = sink;
    }
    event(t, x) {
        this.parent.latestvalue = x;
        this.parent.hasValue = true;
        this.sink.event(t, x);
    }
}
function replayLatest(s, initialState) {
    if (arguments.length === 1) {
        return new ReplayLatest(s);
    }
    else {
        return new ReplayLatest(s, initialState);
    }
}
exports.replayLatest = replayLatest;
class ReplayLatest {
    constructor(source, initialState) {
        this.source = source;
        this.initialState = initialState;
        this.hasValue = false;
        this.hasInitial = arguments.length === 2;
    }
    run(sink, scheduler) {
        const startWithReplay = this.hasValue
            ? core_1.startWith(this.latestvalue)
            : this.hasInitial
                ? core_1.startWith(this.initialState)
                : null;
        const withReplayedValue = startWithReplay ? startWithReplay(this.source) : this.source;
        // return this.source.run(new StateSink(this, sink), scheduler)
        return withReplayedValue.run(new StateSink(this, sink), scheduler);
    }
}
exports.ReplayLatest = ReplayLatest;
//# sourceMappingURL=behavior.js.map