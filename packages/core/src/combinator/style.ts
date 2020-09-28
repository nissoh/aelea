import { Sink, Scheduler, Disposable, Stream } from '@most/types'
import { ElementStream, NodeContainerType, DomNode, StyleCSS, NodeType } from '../types'
import * as CSS from 'csstype'

import { loop, map } from '@most/core'
import { curry2, curry3 } from '@most/prelude'
import { disposeBoth } from '@most/disposable';
import { SettableDisposable } from 'src'


interface StyleCurry {
  <A, B, C extends NodeContainerType, D>(styleInput: StyleCSS | Stream<StyleCSS | null>): (node: ElementStream<C, D, B>) => ElementStream<C, D, A & B>
  <A, B, C extends NodeContainerType, D>(styleInput: StyleCSS | Stream<StyleCSS | null>, node: ElementStream<C, D, B>): ElementStream<C, D, A & B>
}

interface StylePseudoCurry {
  <A, B, C extends NodeContainerType, D, E extends string>(pseudoClass: CSS.Pseudos | E, styleInput: StyleCSS | Stream<StyleCSS | null>, node: ElementStream<C, D, B>): ElementStream<C, D, A & B>
  <A, B, C extends NodeContainerType, D, E extends string>(pseudoClass: CSS.Pseudos | E, styleInput: StyleCSS | Stream<StyleCSS | null>): (node: ElementStream<C, D, B>) => ElementStream<C, D, A & B>
  <A, B, C extends NodeContainerType, D, E extends string>(pseudoClass: CSS.Pseudos | E): (styleInput: StyleCSS | Stream<StyleCSS | null>) => (node: ElementStream<C, D, B>) => ElementStream<C, D, A & B>
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

  constructor() { }



  // would transient rules make increase performance?
  // dispose() {
  //   if (--this.activeUsages > 0) {
  //     return
  //   }

  //   for (const cssStyleRule in StyleRule.stylesheet.cssRules) {
  //     // todo(check why) chrome returns `CSSStyleRule` where typescript defines CSSSRule
  //     if ((<CSSStyleRule>StyleRule.stylesheet.cssRules[cssStyleRule]).selectorText === this.selector) {
  //       StyleRule.stylesheet.removeRule(Number(cssStyleRule))
  //       StyleRule.cache.delete(this.properties)
  //     }
  //   }
  // }

}

class StyleInlineSource<A, B, C extends NodeContainerType, D, E extends string> implements ElementStream<C, D, A & B> {

  constructor(public pseudo: CSS.Pseudos | E, public styleInput: StyleCSS, public source: ElementStream<C, D, A & B>) { }

  run(sink: Sink<DomNode<C, D, A & B>>, scheduler: Scheduler): Disposable {
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


class StyleSource<A, B, C extends NodeContainerType, D, E extends string> implements ElementStream<C, D, A & B> {

  constructor(public pseudo: CSS.Pseudos | E, public styleInput: Stream<StyleCSS | null>, public source: ElementStream<C, D, A & B>) { }

  run(sink: Sink<DomNode<C, D, A & B>>, scheduler: Scheduler): Disposable {

    const styleRuleDiposable = new SettableDisposable()


    const applyStyleEffects = map(
      node => {
        let latestClass: string

        const ss = loop(
          (previousCssRule: null | ReturnType<typeof useStyleRule>, styleObject) => {

            if (previousCssRule) {
              if (styleObject === null) {
                node.element.classList.remove(previousCssRule)
                // seed.disposable.dispose()

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

    return disposeBoth(applyStyleEffects, styleRuleDiposable)
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


function styleFn<A, B, C extends NodeContainerType, D>(styleInput: StyleCSS | Stream<StyleCSS | null>, source: ElementStream<C, D, B>, pseudoClass = ''): ElementStream<C, D, A & B> {

  if (!('run' in styleInput)) {
    if (source instanceof StyleInlineSource && source.pseudo === pseudoClass) {
      return new StyleInlineSource(pseudoClass, { ...source.styleInput, ...styleInput }, source.source)
    } else {
      return new StyleInlineSource(pseudoClass, styleInput, source)
    }
  }

  return new StyleSource(pseudoClass, styleInput, source)
}

function stylePseudoFn<A, B, C extends NodeContainerType, D, E extends string>(pseudoClass: CSS.Pseudos | E, styleInput: StyleCSS | Stream<StyleCSS | null>, source: ElementStream<C, D, B>): ElementStream<C, D, A & B> {
  return styleFn(styleInput, source, pseudoClass)
}


// export const style = styleFn
export const style: StyleCurry = curry2(styleFn)
export const stylePseudo: StylePseudoCurry = curry3(stylePseudoFn)

