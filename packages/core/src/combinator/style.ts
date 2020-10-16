import { Sink, Scheduler, Disposable, Stream } from '@most/types'
import { $Node, NodeContainerType, StyleCSS, ContainerDomNode } from '../types'
import * as CSS from 'csstype'

import { loop, map } from '@most/core'
import { curry2, curry3 } from '@most/prelude'


interface StyleCurry {
  <C extends NodeContainerType, D>(styleInput: StyleCSS | Stream<StyleCSS | null>, node: $Node<C, D>): $Node<C, D>
  <C extends NodeContainerType, D>(styleInput: StyleCSS | Stream<StyleCSS | null>): (node: $Node<C, D>) => $Node<C, D>
}

interface StylePseudoCurry {
  <A, B, C extends NodeContainerType, D, E extends string>(pseudoClass: CSS.Pseudos | E, styleInput: StyleCSS | Stream<StyleCSS | null>, node: $Node<C, D>): $Node<C, D>
  <A, B, C extends NodeContainerType, D, E extends string>(pseudoClass: CSS.Pseudos | E, styleInput: StyleCSS | Stream<StyleCSS | null>): (node: $Node<C, D>) => $Node<C, D>
  <A, B, C extends NodeContainerType, D, E extends string>(pseudoClass: CSS.Pseudos | E): (styleInput: StyleCSS | Stream<StyleCSS | null>) => (node: $Node<C, D>) => $Node<C, D>
}

function useStyleRule(pseudoClass: CSS.Pseudos | string, styles: StyleCSS) {
  const properties = styleObjectAsString(styles)
  const cachedRule = StyleRule.cache.get(pseudoClass + properties)

  if (cachedRule) {
    cachedRule.activeUsages++
    return cachedRule.id
  }

  const newRule = new StyleRule()

  StyleRule.cache.set(pseudoClass + properties, newRule)
  StyleRule.stylesheet.insertRule(`${newRule.selector + pseudoClass} {${properties}}`, newRule.index)

  return newRule.id
}

export class StyleRule {

  static stylesheet = new CSSStyleSheet()
  static cache = new Map<string, StyleRule>()
  static namespace = 'S-'

  index = StyleRule.stylesheet.cssRules.length
  id = StyleRule.namespace + this.index
  selector = `.${this.id}`
  activeUsages = 1
}

class StyleInlineSource<A, B, C extends NodeContainerType, D, E extends string> implements $Node<C, D> {

  constructor(public pseudo: CSS.Pseudos | E, public styleInput: StyleCSS, public source: $Node<C, D>) { }

  run(sink: Sink<ContainerDomNode<C, D>>, scheduler: Scheduler): Disposable {
    const cssClass = useStyleRule(this.pseudo, this.styleInput)

    const disp = map(
      node => {
        node.element.classList.add(cssClass)
        return {
          ...node,
          style: [...node.style]
        }
      },
      this.source
    )
      .run(sink, scheduler)


    return disp
  }
}


class StyleSource<A, B, C extends NodeContainerType, D, E extends string> implements $Node<C, D> {

  constructor(public pseudo: CSS.Pseudos | E, public styleInput: Stream<StyleCSS | null>, public source: $Node<C, D>) { }

  run(sink: Sink<ContainerDomNode<C, D>>, scheduler: Scheduler): Disposable {


    const applyStyleEffects = map(
      node => {
        let latestClass: string

        const ss = loop(
          (previousCssRule: null | ReturnType<typeof useStyleRule>, styleObject) => {

            if (previousCssRule) {
              if (styleObject === null) {
                node.element.classList.remove(previousCssRule)

                return { seed: null, value: '' }
              } else {
                const cashedCssClas = useStyleRule(this.pseudo, styleObject)

                if (previousCssRule !== cashedCssClas) {
                  node.element.classList.replace(latestClass, cashedCssClas)
                  latestClass = cashedCssClas

                  return { seed: cashedCssClas, value: cashedCssClas }
                }
              }
            }

            if (styleObject) {
              const cashedCssClas = useStyleRule(this.pseudo, styleObject)

              node.element.classList.add(cashedCssClas)
              latestClass = cashedCssClas

              return { seed: cashedCssClas, value: cashedCssClas }
            }

            return { seed: previousCssRule, value: '' }
          },
          null,
          this.styleInput
        )

        return {
          ...node,
          style: [...node.style, ss]
        }
      },
      this.source
    )
      .run(sink, scheduler)

    return applyStyleEffects
  }
}


function styleObjectAsString(styleObj: StyleCSS) {
  return Object.entries(styleObj)
    .map(([key, val]) => {
      const kebabCaseKey = key.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
      return `${kebabCaseKey}:${val};`;
    })
    .join("");
}

// Todo sed
function styleFn<C extends NodeContainerType, D>(styleInput: StyleCSS | Stream<StyleCSS | null>, source: $Node<C, D>, pseudoClass = ''): $Node<C, D> {

  if (!('run' in styleInput)) {
    if (source instanceof StyleInlineSource && source.pseudo === pseudoClass) {
      return new StyleInlineSource(pseudoClass, { ...source.styleInput, ...styleInput }, source.source)
    } else {
      return new StyleInlineSource(pseudoClass, styleInput, source)
    }
  }

  return new StyleSource(pseudoClass, styleInput, source)
}

function stylePseudoFn<C extends NodeContainerType, D, E extends string>(pseudoClass: CSS.Pseudos | E, styleInput: StyleCSS | Stream<StyleCSS | null>, source: $Node<C, D>): $Node<C, D> {
  return styleFn(styleInput, source, pseudoClass)
}


export const style: StyleCurry = curry2(styleFn)
export const stylePseudo: StylePseudoCurry = curry3(stylePseudoFn)

