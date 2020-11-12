"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.skipRepeatedPath = exports.modelPath = exports.match = exports.isMatched = void 0;
const core_1 = require("@most/core");
exports.isMatched = (frag, path) => {
    if (frag instanceof RegExp) {
        return Boolean(path === null || path === void 0 ? void 0 : path.match(frag));
    }
    return frag === path;
};
exports.match = (frag) => core_1.filter((path) => {
    return path.remaining.length > 0 && exports.isMatched(frag, path.remaining[0]);
});
exports.modelPath = (frag) => core_1.map((path) => {
    return {
        target: path.target,
        remaining: [...path.remaining.slice(1)],
        fragments: [...path.fragments, frag]
    };
});
exports.skipRepeatedPath = core_1.skipRepeatsWith((from, to) => {
    return from.remaining[0] === to.remaining[0];
});
//# sourceMappingURL=resolve.js.map