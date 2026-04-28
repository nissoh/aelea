/**
 * Aelea DOM renderer — browser-target entry point.
 *
 *   import { $element, $text, component, style } from 'aelea/ui'
 *   import { render, nodeEvent } from 'aelea/dom'
 *
 *   render({ rootAttachment: document.body, $rootNode: $App })
 *
 * Factories (`$element`, `$text`, `$svg`, `$custom`, `$node`,
 * `$wrapNativeElement`) are renderer-agnostic and live in `aelea/ui`;
 * this module only exposes DOM-specific bindings (`render`, event
 * helpers, stylesheet helpers). The agnostic surface is re-exported
 * below as a convenience for consumers that prefer a single import
 * origin.
 */

export {
  $custom,
  $element,
  $node,
  $svg,
  $text,
  $wrapNativeElement,
  attr,
  attrBehavior,
  component,
  createDomScheduler,
  createNode,
  effectProp,
  effectRun,
  motion,
  style,
  styleBehavior,
  styleInline,
  stylePseudo
} from '../ui/index.js'
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
} from '../ui/types.js'
export { createStylePseudoRule, createStyleRule, type INodeElementDom, type IRenderConfig, render } from './dom.js'
export { fromEventTarget, nodeEvent } from './event.js'
