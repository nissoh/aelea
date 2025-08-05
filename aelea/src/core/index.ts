// Re-export all combinators
export * from './combinator/index.js'

// Fetch utilities
export { fetchJson } from './fetch.js'

// Render and scheduler
export type { IRunEnvironment } from './render.js'
export { render } from './render.js'
export { createDomScheduler } from './scheduler.js'

// Node creation
export {
  $custom,
  $element,
  $node,
  $p,
  $svg,
  $wrapNativeElement,
  createNode
} from './source/node.js'

// Text nodes
export type { I$Text } from './source/text.js'
export { $text } from './source/text.js'

// Core types
export type {
  I$Node,
  I$Op,
  I$Slottable,
  IAttributeProperties,
  IComponentBehavior,
  ICreateComponent,
  INode,
  INodeCompose,
  INodeElement,
  IOutputTethers,
  ISlottable,
  ISlottableElement,
  IStyleCSS
} from './types.js'
