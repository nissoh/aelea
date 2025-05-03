// biome-ignore lint/performance/noBarrelFile: entrypoint module
export {
  animationFrames,
  drawLatest,
  nextAnimationFrame,
  motion,
  motionState
} from './combinator/animate.js'
export { attr, attrBehavior } from './combinator/attribute.js'
export { component } from './combinator/component.js'
export { eventElementTarget, nodeEvent } from './combinator/event.js'
export {
  style,
  styleBehavior,
  styleInline,
  stylePseudo
} from './combinator/style.js'
export { runBrowser } from './run.js'
export {
  $custom,
  $element,
  $node,
  $svg,
  $p,
  $text,
  $wrapNativeElement,
  branch
} from './source/node.js'
export type {
  $Branch,
  $Node,
  IBranch,
  IBranchElement,
  IElementConfig,
  INode,
  INodeElement,
  IComposeOrSeed,
  IStyleCSS
} from './types.js'
