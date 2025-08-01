export type { IStreamOrPromise } from '../stream/combinator/switchMap.js'
export { switchMap } from '../stream/combinator/switchMap.js'
export { o } from '../stream/function.js'
export { tether } from '../stream/multicast/tether.js'
export type { IAttributeProperties } from './combinator/attribute.js'
export {
  attr,
  attrBehavior
} from './combinator/attribute.js'
export type { IBehavior, IComposeBehavior } from './combinator/behavior.js'
export { behavior } from './combinator/behavior.js'
export type {
  IComponentDefinitionCallback,
  IComponentOutputBehaviors,
  IOutputTethers
} from './combinator/component.js'
export { component } from './combinator/component.js'
export type { INodeEventCurry } from './combinator/event.js'
export { eventElementTarget, nodeEvent } from './combinator/event.js'
export { fromCallback } from './combinator/fromCallback.js'
export { drawLatest } from './combinator/motion.js'
export type { IStyleCSS } from './combinator/style.js'
export {
  style,
  styleBehavior,
  styleInline,
  stylePseudo
} from './combinator/style.js'
export type { IRunEnvironment } from './run.js'
export { $createRoot } from './run.js'
export {
  MOTION_GENTLE,
  MOTION_NO_WOBBLE,
  MOTION_STIFF,
  MOTION_WOBBLY,
  motion,
  motionState
} from './source/motion.js'
export type {
  I$Node,
  I$Op,
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
export { $text } from './source/text.js'
