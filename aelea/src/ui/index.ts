/**
 * The UI entry point: renderer-agnostic factories, decorators and the
 * component contract, plus the browser renderer re-exported so an app needs
 * one import origin. Other renderers (`aelea/takumi`) consume the same
 * agnostic surface through the mount walk in `backend.ts`.
 */
export {
  createStyleRule,
  type ICommitRecord,
  type IRenderConfig,
  type IRenderDevtool,
  type IRenderResult,
  render
} from '../ui-renderer-dom/dom.js'
export { fromEventTarget, nodeEvent } from '../ui-renderer-dom/event.js'
export { applyOwnedKeys, type IBindingSink, type IMountBackend, MountContext, mountRoot } from './backend.js'
export * from './combinator/attribute.js'
export * from './combinator/component.js'
export * from './combinator/effect.js'
export * from './combinator/motion.js'
export { makeMutator } from './combinator/mutator.js'
export * from './combinator/style.js'
export { type IMountPort, MountPort, onMounted } from './mount.js'
export {
  $custom,
  $element,
  $node,
  $svg,
  $text,
  $wrapNativeElement,
  createNode,
  NODE_BRAND,
  TEXT_BRAND
} from './node.js'
export { createDomScheduler, createHeadlessScheduler, createSyncScheduler, type IUiScheduler } from './scheduler.js'
export type {
  I$Node,
  I$Op,
  I$Scheduler,
  I$Slottable,
  I$Text,
  IAttributeProperties,
  IAttributes,
  IComponentBehavior,
  IEffect,
  IElementDescriptor,
  IMutator,
  INode,
  INodeCompose,
  IOutputTethers,
  IRecipe,
  ISlotChild,
  ISlottable,
  IStaticStyleEntry,
  IStyleCSS,
  ITextNode
} from './types.js'
