/**
 * The browser renderer. Factories, decorators and the component contract
 * live in `aelea/ui`, which also re-exports this module for single-origin
 * imports; import from here only for renderer-level work.
 */
export {
  createStyleRule,
  type ICommitRecord,
  type INodeElementDom,
  type IRenderConfig,
  type IRenderDevtool,
  type IRenderResult,
  render
} from './dom.js'
export { fromEventTarget, nodeEvent } from './event.js'
