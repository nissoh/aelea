import { map } from '@most/core'
import { curry2 } from '@most/prelude'
import { Stream } from '@most/types'
import { $Branch, IBranchElement, StyleCSS } from '../types'


interface StyleCurry {
  <C extends IBranchElement, D>(styleInput: StyleCSS, node: $Branch<C, D>): $Branch<C, D>
  <C extends IBranchElement, D>(styleInput: StyleCSS): (node: $Branch<C, D>) => $Branch<C, D>
}

interface StyleBehaviorCurry {
  <C extends IBranchElement, D>(styleInput: Stream<StyleCSS | null>, node: $Branch<C, D>): $Branch<C, D>
  <C extends IBranchElement, D>(styleInput: Stream<StyleCSS | null>): (node: $Branch<C, D>) => $Branch<C, D>
}


function styleFn<C extends IBranchElement, D>(styleInput: StyleCSS, source: $Branch<C, D>): $Branch<C, D> {
  return map(node => ({ ...node, style: { ...node.style, ...styleInput } }), source)
}

function styleBehaviorFn<C extends IBranchElement, D>(style: Stream<StyleCSS | null>, $node: $Branch<C, D>): $Branch<C, D> {
  return map(node => ({ ...node, styleBehaviors: [...node.styleBehaviors, style] }), $node)
}

// applyStyle
export const style: StyleCurry = curry2(styleFn)
export const styleBehavior: StyleBehaviorCurry = curry2(styleBehaviorFn)

