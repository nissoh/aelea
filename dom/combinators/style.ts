import * as CSS from 'csstype'
import { filter, map, tap } from '@most/core'
import { curry2, curry3 } from '@most/prelude'
import { Stream } from '@most/types'
import { $Branch, IBranchElement, StyleCSS } from '../types'


interface StyleCurry {
  <C extends IBranchElement, D>(styleInput: StyleCSS, node: $Branch<C, D>): $Branch<C, D>
  <C extends IBranchElement, D>(styleInput: StyleCSS): (node: $Branch<C, D>) => $Branch<C, D>
}

interface StylePseudoCurry {
  <C extends IBranchElement, E extends string>(pseudoClass: CSS.Pseudos | E, styleInput: StyleCSS, node: $Branch<C>): $Branch<C>
  <C extends IBranchElement, E extends string>(pseudoClass: CSS.Pseudos | E, styleInput: StyleCSS): (node: $Branch<C>) => $Branch<C>
  <C extends IBranchElement, E extends string>(pseudoClass: CSS.Pseudos | E): (styleInput: StyleCSS) => (node: $Branch<C>) => $Branch<C>
}

interface StyleBehaviorCurry {
  <C extends IBranchElement, D>(styleInput: Stream<StyleCSS | null>, node: $Branch<C, D>): $Branch<C, D>
  <C extends IBranchElement, D>(styleInput: Stream<StyleCSS | null>): (node: $Branch<C, D>) => $Branch<C, D>
}


function styleFn<C extends IBranchElement, D>(styleInput: StyleCSS, source: $Branch<C, D>): $Branch<C, D> {
  return map(node => ({ ...node, style: { ...node.style, ...styleInput } }), source)
}

function stylePseudoFn<C extends IBranchElement, E extends string>(pseudoClass: CSS.Pseudos | E, styleInput: StyleCSS, source: $Branch<C>): $Branch<C> {
  return map(node => ({
    ...node,
    stylePseudo: [
      ...node.stylePseudo,
      {
        class: pseudoClass,
        style: styleInput
      }
    ]
  }), source)
}

function styleBehaviorFn<C extends IBranchElement, D>(style: Stream<StyleCSS | null>, $node: $Branch<C, D>): $Branch<C, D> {
  return map(node => ({ ...node, styleBehavior: [...node.styleBehavior, style] }), $node)
}

export const styleInline = <A extends IBranchElement, B>(style: Stream<StyleCSS>,) => ($node: $Branch<A, B>): $Branch<A, B> => {

  return map(node => {
    const applyInlineStyleStream = tap((styleObj) => {
      for (const prop in styleObj) {
        if (Object.prototype.hasOwnProperty.call(styleObj, prop)) {
          // @ts-ignore
          const val = styleObj[prop]

          // @ts-ignore
          node.element.style[prop] = val
        }
      }
    }, style)

    return { ...node, styleBehavior: [...node.styleBehavior, filter(() => false, applyInlineStyleStream)] }
  }, $node)

}

// applyStyle
export const style: StyleCurry = curry2(styleFn)
export const stylePseudo: StylePseudoCurry = curry3(stylePseudoFn)
export const styleBehavior: StyleBehaviorCurry = curry2(styleBehaviorFn)

