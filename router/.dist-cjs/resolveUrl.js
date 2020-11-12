"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.path = exports.router = void 0;
const core_1 = require("@most/core");
const core_2 = require("@aelea/core");
const resolve_1 = require("./resolve");
const routerDefaults = {
    splitUrlPattern: /(?:\/|$)/,
    rootFragment: ''
};
exports.router = (pathChange, options = routerDefaults) => {
    const opts = options === routerDefaults
        ? routerDefaults
        : { ...routerDefaults, ...options };
    const url = core_2.O(core_1.skipRepeats, core_1.map((rawPath) => {
        const urlToFragments = rawPath.substr(1).split(opts.splitUrlPattern);
        const targetPaths = [opts.rootFragment, ...urlToFragments];
        return {
            target: targetPaths,
            fragments: [],
            remaining: targetPaths
        };
    }));
    const rootRoute = resolveRoute(url(pathChange), [])(opts.rootFragment);
    return rootRoute;
};
function resolveRoute(pathChange, parentFragments) {
    return (fragment) => {
        const fragments = [...parentFragments, fragment];
        const fragIdx = parentFragments.length;
        const diff = core_2.O(core_1.skipRepeatsWith((prev, next) => {
            return next.target[fragIdx] === prev.target[fragIdx];
        }));
        const currentMatch = core_2.O(diff, core_1.filter(next => {
            return resolve_1.isMatched(fragment, next.target[fragIdx]);
        }));
        const currentMiss = core_2.O(diff, core_1.filter(next => !resolve_1.isMatched(fragment, next.target[fragIdx])));
        return {
            create: resolveRoute(pathChange, fragments),
            match: currentMatch(pathChange),
            miss: currentMiss(pathChange),
            fragments
        };
    };
}
exports.path = (route) => (ns) => {
    return core_1.join(core_1.constant(core_1.until(route.miss, ns), route.match));
};
//# sourceMappingURL=resolveUrl.js.map