import { Stream } from '@most/types';
import { $Node, NodeContainerType, StyleCSS } from '../types';
declare type RafHandlerId = number;
declare type RafHandler = (dts: RafHandlerId) => void;
declare type AnimationFrameRequestTime = number;
declare type AnimationFrameResponseTime = number;
export interface AnimationFrame {
    requestTime: AnimationFrameRequestTime;
    responseTime: AnimationFrameResponseTime;
}
export declare type AnimationFrames = {
    requestAnimationFrame: (f: RafHandler) => AnimationFrameRequestTime;
    cancelAnimationFrame: (f: AnimationFrameRequestTime) => void;
};
export declare const nextAnimationFrame: (afp?: AnimationFrames) => Stream<AnimationFrame>;
export declare const animationFrames: (afp?: AnimationFrames) => Stream<AnimationFrame>;
export declare const drawLatest: <A>(x: Stream<A>) => Stream<A>;
interface Motion {
    stiffness: number;
    damping: number;
    precision: number;
}
export declare const MOTION_NO_WOBBLE: {
    stiffness: number;
    damping: number;
    precision: number;
};
export declare const MOTION_GENTLE: {
    stiffness: number;
    damping: number;
    precision: number;
};
export declare const MOTION_WOBBLY: {
    stiffness: number;
    damping: number;
    precision: number;
};
export declare const MOTION_STIFF: {
    stiffness: number;
    damping: number;
    precision: number;
};
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
export declare const motion: import("@most/prelude").Curried3<Partial<Motion>, number, Stream<number>, Stream<number>>;
export declare const styleInMotion: <A extends NodeContainerType, B>(style: Stream<StyleCSS>) => ($node: $Node<A, B>) => $Node<A, B>;
export {};
//# sourceMappingURL=animate.d.ts.map