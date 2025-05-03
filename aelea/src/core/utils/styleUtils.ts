import type { IStyleCSS } from '../combinator/style.js'
import type { IStyleEnvironment } from '../combinator/style.js'

function styleObjectAsString(styleObj: IStyleCSS) {
  return Object.entries(styleObj)
    .map(([key, val]) => {
      const kebabCaseKey = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
      return `${kebabCaseKey}:${val};`
    })
    .join('')
}

export function useStyleRule(cacheService: IStyleEnvironment, styleDefinition: IStyleCSS) {
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

export function useStylePseudoRule(cacheService: IStyleEnvironment, styleDefinition: IStyleCSS, pseudo = '') {
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
