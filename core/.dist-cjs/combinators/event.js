"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.event = exports.eventElementTarget = void 0;
const core_1 = require("@most/core");
const prelude_1 = require("@most/prelude");
function eventElementTarget(eventType, node, options = false) {
    return {
        run(sink, scheduler) {
            const cb = (e) => sink.event(scheduler.currentTime(), e);
            const dispose = () => node.removeEventListener(eventType, cb, options);
            node.addEventListener(eventType, cb, options);
            return {
                dispose() {
                    dispose();
                }
            };
        }
    };
}
exports.eventElementTarget = eventElementTarget;
exports.event = prelude_1.curry2((eventType, node) => {
    return core_1.join(core_1.map(ns => eventElementTarget(eventType, ns.element, { capture: true }), node));
});
//# sourceMappingURL=event.js.map