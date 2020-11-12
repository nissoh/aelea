"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.O = exports.nullDisposable = exports.nullSink = exports.Pipe = exports.isEmpty = exports.isFunction = exports.isStream = exports.MaybeOp = exports.xForver = void 0;
const prelude_1 = require("@most/prelude");
const core_1 = require("@most/core");
exports.xForver = (x) => core_1.startWith(x, core_1.never());
function MaybeOp(a, b) {
    return b ? prelude_1.compose(b, a) : a;
}
exports.MaybeOp = MaybeOp;
function isStream(s) {
    return s instanceof Object && 'run' in s;
}
exports.isStream = isStream;
function isFunction(s) {
    return s instanceof Function;
}
exports.isFunction = isFunction;
const EMPTY = core_1.empty();
function isEmpty(s) {
    return s === EMPTY;
}
exports.isEmpty = isEmpty;
class Pipe {
    constructor(sink) {
        this.sink = sink;
    }
    end(t) {
        return this.sink.end(t);
    }
    error(t, e) {
        return this.sink.error(t, e);
    }
}
exports.Pipe = Pipe;
exports.nullSink = {
    // tslint:disable-next-line:no-empty
    event() { },
    // tslint:disable-next-line:no-empty
    end() { },
    // tslint:disable-next-line:no-empty
    error(_, x) {
        // tslint:disable-next-line: no-console
        console.error(x);
    }
};
exports.nullDisposable = {
    // tslint:disable-next-line:no-empty
    dispose() { }
};
// /* tslint:enable:max-line-length */
function O(...fns) {
    // @ts-ignore
    return fns.length ? fns.reduceRight(prelude_1.compose) : prelude_1.id;
}
exports.O = O;
//# sourceMappingURL=utils.js.map