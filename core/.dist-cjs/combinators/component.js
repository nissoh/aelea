"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.component = exports.componentFn = void 0;
const behavior_1 = require("../source/behavior");
const disposable_1 = require("@most/disposable");
const prelude_1 = require("@most/prelude");
const utils_1 = require("../utils");
function componentFn(inputComp, projectBehaviors) {
    return {
        run(sink, scheduler) {
            // fill stubbed aguments as a behavior
            const behaviors = Array(inputComp.length).fill(null).map(behavior_1.behavior);
            const [view, outputBehaviors] = inputComp(...behaviors);
            const outputDisposables = [];
            if (projectBehaviors) {
                for (const k in projectBehaviors) {
                    if (projectBehaviors[k] && outputBehaviors) {
                        const consumerSampler = projectBehaviors[k];
                        if (consumerSampler) {
                            const componentOutputBehavior = outputBehaviors[k];
                            const outputDisposable = consumerSampler(componentOutputBehavior).run(utils_1.nullSink, scheduler);
                            outputDisposables.push(outputDisposable);
                        }
                    }
                }
            }
            return disposable_1.disposeAll([
                view.run(sink, scheduler),
                ...outputDisposables,
            ]);
        }
    };
}
exports.componentFn = componentFn;
exports.component = prelude_1.curry2(componentFn);
//# sourceMappingURL=component.js.map