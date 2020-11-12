"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.styleInMotion = exports.motion = exports.MOTION_STIFF = exports.MOTION_WOBBLY = exports.MOTION_GENTLE = exports.MOTION_NO_WOBBLE = exports.drawLatest = exports.animationFrames = exports.nextAnimationFrame = void 0;
const scheduler_1 = require("@most/scheduler");
const core_1 = require("@most/core");
const utils_1 = require("../utils");
const disposable_1 = require("@most/disposable");
const prelude_1 = require("@most/prelude");
// copied & modified from https://github.com/mostjs/x-animation-frame/tree/master
class AnimationFrameSource {
    constructor(afp) {
        this.afp = afp;
    }
    run(sink, scheduler) {
        const requestTime = scheduler_1.currentTime(scheduler);
        const propagate = () => eventThenEnd(requestTime, scheduler_1.currentTime(scheduler), sink);
        const rafId = this.afp.requestAnimationFrame(propagate);
        return disposable_1.disposeWith(fid => this.afp.cancelAnimationFrame(fid), rafId);
    }
}
const eventThenEnd = (requestTime, responseTime, sink) => {
    sink.event(requestTime, { requestTime, responseTime });
    sink.end(requestTime);
};
exports.nextAnimationFrame = (afp = window) => new AnimationFrameSource(afp);
exports.animationFrames = (afp = window) => core_1.continueWith(() => exports.animationFrames(afp), exports.nextAnimationFrame(afp));
exports.drawLatest = prelude_1.compose(
// @ts-ignore
core_1.switchLatest, core_1.map(x => core_1.constant(x, exports.nextAnimationFrame(window))));
exports.MOTION_NO_WOBBLE = { stiffness: 170, damping: 26, precision: .01 };
exports.MOTION_GENTLE = { stiffness: 120, damping: 14, precision: .01 };
exports.MOTION_WOBBLY = { stiffness: 180, damping: 12, precision: .01 };
exports.MOTION_STIFF = { stiffness: 210, damping: 20, precision: .01 };
/**
 * adapting to motion changes using "spring physics"
 *
 * @param initialPositon - animation starting position to animate from
 * @param motionEnvironment - config spring metrics.
 *
 *  noWobble =  stiffness 170 damping 26
 *
 *  gentle =    stiffness 120 damping 14
 *
 *  wobbly =    stiffness 180 damping 12
 *
 *  stiff =     stiffness 210 damping 20
 *
 *  @see  modified-from https://github.com/chenglou/react-motion/blob/master/src/stepper.js
 */
exports.motion = prelude_1.curry3((motionEnvironment, startAt, change) => {
    const motionEnv = { ...exports.MOTION_STIFF, ...motionEnvironment };
    return utils_1.O(core_1.loop((seed, target) => {
        const frames = utils_1.O(core_1.map(() => {
            return stepFrame(target, seed, motionEnv).position;
        }), core_1.skipAfter(n => n === target));
        return { seed, value: frames(exports.animationFrames()) };
    }, { velocity: 0, position: startAt }), core_1.switchLatest, core_1.startWith(startAt))(change);
});
exports.styleInMotion = (style) => ($node) => {
    return core_1.map(node => {
        const applyInlineStyleStream = core_1.tap((styleObj) => {
            for (const prop in styleObj) {
                if (Object.prototype.hasOwnProperty.call(styleObj, prop)) {
                    // @ts-ignore
                    const val = styleObj[prop];
                    // @ts-ignore
                    node.element.style[prop] = val;
                }
            }
        }, style);
        return { ...node, style: [...node.style, applyInlineStyleStream] };
    }, $node);
};
function stepFrame(target, state, motionEnv) {
    // const dddd = (frame.responseTime - frame.requestTime) / 1000 || (1 / 60)
    const fps = 1 / 60;
    const delta = target - state.position;
    const spring = motionEnv.stiffness * delta;
    const damper = motionEnv.damping * state.velocity;
    const acceleration = spring - damper;
    const newVelocity = state.velocity + (acceleration * fps);
    const newPosition = state.position + (newVelocity * fps);
    const settled = Math.abs(newVelocity) < motionEnv.precision && Math.abs(delta) < motionEnv.precision;
    state.velocity = newVelocity;
    state.position = settled ? target : newPosition;
    return state;
}
//# sourceMappingURL=animate.js.map