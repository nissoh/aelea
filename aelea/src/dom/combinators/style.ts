import { filter, map, tap } from '@most/core'
import { curry2, curry3 } from '@most/prelude'
import type { Stream } from '@most/types'
import type * as CSS from 'csstype'
import type { $Branch, IBranchElement, IStyleCSS } from '../types.js'


interface StyleCurry {
  <C extends IBranchElement, D>(styleInput: IStyleCSS, node: $Branch<C, D>): $Branch<C, D>
  <C extends IBranchElement, D>(styleInput: IStyleCSS): (node: $Branch<C, D>) => $Branch<C, D>
}

interface StylePseudoCurry {
  <C extends IBranchElement, E extends string>(pseudoClass: CSS.Pseudos | E, styleInput: IStyleCSS, node: $Branch<C>): $Branch<C>
  <C extends IBranchElement, E extends string>(pseudoClass: CSS.Pseudos | E, styleInput: IStyleCSS): (node: $Branch<C>) => $Branch<C>
  <C extends IBranchElement, E extends string>(pseudoClass: CSS.Pseudos | E): (styleInput: IStyleCSS) => (node: $Branch<C>) => $Branch<C>
}

interface StyleBehaviorCurry {
  <C extends IBranchElement, D>(styleInput: Stream<IStyleCSS | null>, node: $Branch<C, D>): $Branch<C, D>
  <C extends IBranchElement, D>(styleInput: Stream<IStyleCSS | null>): (node: $Branch<C, D>) => $Branch<C, D>
}


function styleFn<C extends IBranchElement, D>(styleInput: IStyleCSS, source: $Branch<C, D>): $Branch<C, D> {
  return map(node => ({ ...node, style: { ...node.style, ...styleInput } }), source)
}

function stylePseudoFn<C extends IBranchElement, E extends string>(pseudoClass: CSS.Pseudos | E, styleInput: IStyleCSS, source: $Branch<C>): $Branch<C> {
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

function styleBehaviorFn<C extends IBranchElement, D>(style: Stream<IStyleCSS | null>, $node: $Branch<C, D>): $Branch<C, D> {
  return map(node => ({ ...node, styleBehavior: [...node.styleBehavior, style] }), $node)
}

export const styleInline = <A extends IBranchElement, B>(style: Stream<IStyleCSS>,) => ($node: $Branch<A, B>): $Branch<A, B> => {

  return map(node => {
    const applyInlineStyleStream = tap(styleObj => {

      const keys = Object.keys(styleObj)

      for (let i = 0; i < keys.length; i++) {
        const prop = keys[i]

        if (Object.prototype.hasOwnProperty.call(styleObj, prop)) {
          const styleDec = node.element.style
          const value = styleObj[prop as keyof IStyleCSS]

          // Ensure value is a string or null for setProperty
          styleDec.setProperty(prop, value === null || value === undefined ? null : String(value))
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

