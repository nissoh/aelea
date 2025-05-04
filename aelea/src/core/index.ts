// biome-ignore lint/performance/noBarrelFile: entrypoint module
export {
  animationFrames,
  drawLatest,
  nextAnimationFrame,
  motion,
  motionState
} from './combinator/animate.js'
export type { AnimationFrames } from './combinator/animate.js'
export {
  attr,
  attrBehavior
} from './combinator/attribute.js'
export type {
  IAttributeBehaviorCurry,
  IAttributeCurry,
  IAttributeProperties
} from './combinator/attribute.js'
export { component } from './combinator/component.js'
export type {
  IComponentDefinitionCallback,
  IComponentOutputBehaviors,
  IComponentCurry,
  IOutputTethers
} from './combinator/component.js'
export { eventElementTarget, nodeEvent } from './combinator/event.js'
export type { INodeEventCurry } from './combinator/event.js'
export {
  style,
  styleBehavior,
  styleInline,
  stylePseudo
} from './combinator/style.js'
export type { IStyleCSS, IStyleBehaviorCurry, IStyleCurry, IStylePseudoCurry } from './combinator/style.js'
export { runBrowser } from './run.js'
export type { IRunEnvironment, IStyleEnvironment } from './run.js'
export {
  $custom,
  $element,
  $node,
  $svg,
  $p,
  $wrapNativeElement,
  createNode
} from './source/node.js'
export type {
  I$Branch,
  I$Node,
  IBranch,
  INodeCompose,
  INode,
  INodeElement,
  IBranchElement,
  IText
} from './source/node.js'
export { $text } from './source/text.js'
export { combineArray, combineState } from './combinator/combine.js'
export { fromCallback } from './combinator/fromCallback.js'
export { tether } from './combinator/tether.js'
export { behavior } from './combinator/behavior.js'
export type { IBehavior, IComposeBehavior } from './combinator/behavior.js'
export { ReplayLatest, replayLatest } from './combinator/replay.js'
export { O, groupByMap, nullSink, xForver } from './common.js'
export type { IOps, IOp } from './common.js'
