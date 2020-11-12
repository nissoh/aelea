"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tether = exports.Tether = void 0;
const disposable_1 = require("@most/disposable");
const prelude_1 = require("@most/prelude");
const utils_1 = require("../utils");
class SourceSink {
    constructor(parent, sink) {
        this.parent = parent;
        this.sink = sink;
        this.hasValue = false;
    }
    event(t, x) {
        this.value = x;
        this.hasValue = true;
        this.sink.event(t, x);
        this.parent.tetherSink.forEach(s => s.event(t, x));
    }
    end(t) {
        this.sink.end(t);
    }
    error(t, e) {
        this.sink.error(t, e);
    }
}
class TetherSink extends utils_1.Pipe {
    constructor(sink) {
        super(sink);
    }
    event(t, x) {
        this.sink.event(t, x);
    }
}
class Tether {
    constructor(source) {
        this.source = source;
        this.sourceSink = null;
        this.tetherSink = [];
    }
    run(sink, scheduler) {
        var _a;
        if (sink instanceof SourceSink) {
            if (this.sourceSink) {
                throw new Error('Cannot split multiple sources');
            }
            this.sourceSink = sink;
            const sourceDisposable = this.source.run(sink, scheduler);
            return {
                dispose: () => {
                    sourceDisposable.dispose();
                    this.tetherSink = [];
                    this.sourceSink = null;
                }
            };
        }
        if (sink instanceof TetherSink) {
            this.tetherSink.push(sink);
            if ((_a = this.sourceSink) === null || _a === void 0 ? void 0 : _a.hasValue) {
                sink.event(scheduler.currentTime(), this.sourceSink.value);
            }
            return disposable_1.disposeWith(s => {
                const sinkIdx = this.tetherSink.indexOf(s);
                if (sinkIdx > -1) {
                    this.tetherSink[sinkIdx].end(scheduler.currentTime());
                    prelude_1.remove(sinkIdx, this.tetherSink);
                }
            }, sink);
        }
        throw new Error(`Sink is not an instance of ${SourceSink.name} or ${TetherSink.name}`);
    }
}
exports.Tether = Tether;
exports.tether = (source) => {
    const split = new Tether(source);
    return [
        {
            run(sink, scheduler) {
                return split.run(new SourceSink(split, sink), scheduler);
            }
        },
        {
            run(sink, scheduler) {
                return split.run(new TetherSink(sink), scheduler);
            }
        }
    ];
};
//# sourceMappingURL=tether.js.map