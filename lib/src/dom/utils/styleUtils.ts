import { loop } from "@most/core"
import type { Stream } from "@most/types"
import type { StyleCSS, IBranch, StyleEnvironment } from "../types.js"


export function applyStyleBehavior(styleBehavior: Stream<StyleCSS | null>, node: IBranch, styleEnv: StyleEnvironment) {

  let latestClass: string

  return loop(
    (previousCssRule: null | ReturnType<typeof useStyleRule>, styleObject) => {

      if (previousCssRule) {
        if (styleObject === null) {
          node.element.classList.remove(previousCssRule)

          return { seed: null, value: '' }
        } else {
          const cashedCssClas = useStyleRule(styleEnv, styleObject)

          if (previousCssRule !== cashedCssClas) {
            node.element.classList.replace(latestClass, cashedCssClas)
            latestClass = cashedCssClas

            return { seed: cashedCssClas, value: cashedCssClas }
          }
        }
      }

      if (styleObject) {
        const cashedCssClas = useStyleRule(styleEnv, styleObject)

        node.element.classList.add(cashedCssClas)
        latestClass = cashedCssClas

        return { seed: cashedCssClas, value: cashedCssClas }
      }

      return { seed: previousCssRule, value: '' }
    },
    null,
    styleBehavior
  )
}

function styleObjectAsString(styleObj: StyleCSS) {
  return Object.entries(styleObj)
    .map(([key, val]) => {
      const kebabCaseKey = key.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()
      return `${kebabCaseKey}:${val};`
    })
    .join("")
}


export function useStyleRule(cacheService: StyleEnvironment, styleDefinition: StyleCSS) {
  const properties = styleObjectAsString(styleDefinition)
  const cachedRuleIdx = cacheService.cache.indexOf(properties)

  if (cachedRuleIdx === -1) {
    const index = cacheService.stylesheet.cssRules.length
    const namespace = cacheService.namespace + index

    cacheService.cache.push(properties)
    cacheService.stylesheet.insertRule(`.${namespace} {${properties}}`, index)
    return `${cacheService.namespace + index}`
  }

  return `${cacheService.namespace + cachedRuleIdx}`
}

export function useStylePseudoRule(cacheService: StyleEnvironment, styleDefinition: StyleCSS, pseudo = '') {
  const properties = styleObjectAsString(styleDefinition)
  const index = cacheService.stylesheet.cssRules.length
  const rule = `.${cacheService.namespace + index + pseudo} {${properties}}`
  const cachedRuleIdx = cacheService.cache.indexOf(rule)

  if (cachedRuleIdx === -1) {
    cacheService.cache.push(rule)
    cacheService.stylesheet.insertRule(rule, index)
    return `${cacheService.namespace + index}`
  }

  return `${cacheService.namespace + cachedRuleIdx}`
}


