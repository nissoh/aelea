// biome-ignore lint/performance/noBarrelFile: entrypoint module
export { animationFrames, drawLatest, nextAnimationFrame, motion, motionState } from './combinators/animate.js'
export { attr, attrBehavior } from './combinators/attribute.js'
export { component } from './combinators/component.js'
export { eventElementTarget, nodeEvent } from './combinators/event.js'
export { style, styleBehavior, styleInline, stylePseudo } from './combinators/style.js'
export { runBrowser } from './run.js'
export { $custom, $element, $node, $svg, $text, $wrapNativeElement, branch } from './source/node.js'
export type {
  $Branch, $Node, IBranch, IBranchElement, IElementConfig, INode,
  INodeElement, $Text, NodeComposeFn, IStyleCSS
} from './types.js'


