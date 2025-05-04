/** biome-ignore-all lint/performance/noBarrelFile: entrypoint module */
export type { AnimationFrames } from './combinator/animate.js'
export {
  animationFrames,
  drawLatest,
  motion,
  motionState,
  nextAnimationFrame
} from './combinator/animate.js'
export type {
  IAttributeBehaviorCurry,
  IAttributeCurry,
  IAttributeProperties
} from './combinator/attribute.js'
export {
  attr,
  attrBehavior
} from './combinator/attribute.js'
export type { IBehavior, IComposeBehavior } from './combinator/behavior.js'
export { behavior } from './combinator/behavior.js'
export { combineArray, combineState } from './combinator/combine.js'
export type {
  IComponentCurry,
  IComponentDefinitionCallback,
  IComponentOutputBehaviors,
  IOutputTethers
} from './combinator/component.js'
export { component } from './combinator/component.js'
export type { INodeEventCurry } from './combinator/event.js'
export { eventElementTarget, nodeEvent } from './combinator/event.js'
export { fromCallback } from './combinator/fromCallback.js'
export { ReplayLatest, replayLatest } from './combinator/replay.js'
export type { IStyleBehaviorCurry, IStyleCSS, IStyleCurry, IStylePseudoCurry } from './combinator/style.js'
export {
  style,
  styleBehavior,
  styleInline,
  stylePseudo
} from './combinator/style.js'
export { tether } from './combinator/tether.js'
export type { IOp, IOps } from './common.js'
export { groupByMap, isEmpty, isStream, maybeOps, nullSink, O, xForver } from './common.js'
export type { IRunEnvironment, IStyleEnvironment } from './run.js'
export { runBrowser } from './run.js'
export type {
  I$Node,
  I$Slottable,
  INode,
  INodeCompose,
  INodeElement,
  ISlottable,
  ISlottableElement
} from './source/node.js'
export {
  $custom,
  $element,
  $node,
  $p,
  $svg,
  $wrapNativeElement,
  createNode
} from './source/node.js'
export type { I$Text } from './source/text.js'
export { $text, $textNode } from './source/text.js'
