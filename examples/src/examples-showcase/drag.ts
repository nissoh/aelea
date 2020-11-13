// import { until, switchLatest, empty, chain, merge, map } from "@most/core";
// import { Stream } from "@most/types";
// import { motionState, O, eventElementTarget, event } from '@aelea/core';


// function elementTransformArgs(el: HTMLElement) {
//     return el.style.transform.replace(/[^0-9\-.,]/g, '').split(',').map(Number)
// }

// function mouseVelocity(from: PointerEvent, to: PointerEvent) {
//     const xdist = to.pageX - from.pageX
//     const ydist = to.pageY - from.pageY

//     const interval = to.timeStamp - from.timeStamp;


//     return Math.sqrt(xdist * xdist + ydist * ydist) / interval
// }

// const clamp = (val: number, min: number, max: number) =>
//     val > max ? max
//         : val < min ? min
//             : val

// // function decelerateObjectPosition(startEv: PointerEvent, target: HTMLElement, stop: Stream<PointerEvent>) {
// //     return chain(ev => {
// //         const vlc = mouseVelocity(startEv, ev);

// //         const [currentElX = 0, currentElY = 0] = elementTransformArgs(target);
// //         const tx = (ev.pageX - startEv.pageX) * vlc;
// //         const ty = (ev.pageY - startEv.pageY) * vlc;

// //         return motionState({ initial: 0 }, freq => {
// //             return { x: currentElX + (tx * freq), y: currentElY + (ty * freq) };
// //         });
// //     }, stop);
// // }


// const moveStart = O(
//     event('pointerdown'),
//     map(startEv => {
//         if (!(startEv.currentTarget instanceof HTMLElement)) {
//             throw new Error('target is not an Element type')
//         }

//         const target = startEv.currentTarget
//         const containerWidth = target.parentElement!.clientWidth
//         const containerHeight = target.parentElement!.clientHeight

//         // minX to 0 will avoid scrolling via @calmp function ^
//         const minX = target.clientWidth > containerWidth ? -target.clientWidth + containerWidth : 0
//         const minY = target.clientHeight > containerHeight ? -target.clientHeight + containerHeight : 0

//         const [initElX = 0, initElY = 0] = elementTransformArgs(target);

//         const initX = startEv.pageX - initElX
//         const initY = startEv.pageY - initElY

//         const pointingMove = O(
//             eventElementTarget('pointermove'),
//             // drawLatest,
//             map(ev => ({
//                 x: ev.pageX - initX,
//                 y: ev.pageY - initY
//             }))
//         )(window)

//         const stop = eventElementTarget('pointerup', window)

//         // const decelerate = decelerateObjectPosition(startEv, target, stop)

//         const move =
//             // merge(
//             until(stop, pointingMove),
//             // decelerate
//         // )

//         return map(state => {
//             const { x, y } = state
//             return {
//                 style: `transform: translate(${clamp(x, minX, 0)}px, ${clamp(y, minY, 0)}px);`
//             }
//         }, move)
//     }),
//     switchLatest
// )

// const svgInteraction = O(
//     event('pointerdown'),
//     map(downEv => {

//         const up = eventElementTarget('pointerup', downEv.currentTarget!)
//         const move = eventElementTarget('pointermove', downEv.currentTarget!)
//         const stop = until(up)

//         const target = downEv.target

//         if (target instanceof SVGCircleElement) {

//             const initX = target.cx.baseVal.value
//             const initY = target.cy.baseVal.value

//             const decelerate = switchLatest(
//                 map(ev => {
//                     const vlc = mouseVelocity(downEv, ev)

//                     const cX = target.cx.baseVal.value
//                     const cY = target.cy.baseVal.value

//                     const tx = (ev.pageX - downEv.pageX) * vlc
//                     const ty = (ev.pageY - downEv.pageY) * vlc

//                     return map(freq => (
//                         { cx: cX + (tx * freq), cy: cY + (ty * freq) }
//                     ), motionState())

//                 }, up)
//             )

//             return merge(
//                 stop(
//                     map(moveEv => {
//                         return {
//                             cx: moveEv.pageX - downEv.pageX + initX,
//                             cy: moveEv.pageY - downEv.pageY + initY
//                         }
//                     }, move)
//                 ),
//                 decelerate
//             )
//         }

//         return empty()
//     }),
//     switchLatest
// )



