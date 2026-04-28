// Renderer-agnostic core: types, factories, combinators, scheduler contracts.
// Pick a renderer (DOM, takumi, …) at the call site:
//
//   import { $element, $text, component, style } from 'aelea/ui'
//   import { render }      from 'aelea/dom'
//   import { renderToImage } from 'aelea/takumi'
//
//   render({ rootAttachment: document.body, $rootNode: $App })
//   // or
//   const bytes = await renderToImage($App, { width, height })

// DOM renderer re-exports — convenience so apps can import their render
// entry point alongside factories from a single origin. The renderer
// choice is still `render(...)` (DOM) vs `renderToImage(...)` (takumi);
// these re-exports just spare a second import statement.
export { createStylePseudoRule, createStyleRule, type IRenderConfig, render } from '../ui-renderer-dom/dom.js'
export { fromEventTarget, nodeEvent } from '../ui-renderer-dom/event.js'
export * from './combinator/attribute.js'
export * from './combinator/component.js'
export * from './combinator/effect.js'
export * from './combinator/motion.js'
export * from './combinator/style.js'
export { $custom, $element, $node, $svg, $text, $wrapNativeElement, createNode } from './node.js'
export { createDomScheduler, createHeadlessScheduler } from './scheduler.js'
export type {
  I$Node,
  I$Op,
  I$Scheduler,
  I$Slottable,
  I$Text,
  IAttributeProperties,
  IComponentBehavior,
  INode,
  INodeCompose,
  IOutputTethers,
  ISlotChild,
  ISlottable,
  IStyleCSS,
  ITextNode
} from './types.js'
