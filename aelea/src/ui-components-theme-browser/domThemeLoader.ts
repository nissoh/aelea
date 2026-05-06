import { writeTheme } from '../ui-components-theme/globalState.js'
import type { Palette, Theme } from '../ui-components-theme/types.js'

const localStorageKey = '__AELEA_THEME__'
const configStyleId = 'aelea-theme-config'

const PALETTE_ROLES: readonly (keyof Palette)[] = [
  'primary',
  'message',
  'background',
  'horizon',
  'middleground',
  'foreground',
  'positive',
  'negative',
  'indeterminate'
]

// Legacy CSSOM (`rule.style`) instead of Typed CSSOM (`rule.styleMap`):
// Firefox doesn't ship styleMap, Safari only got it in 17.4.
function parseCSSStyleValue(rule: CSSStyleRule, key: string): string | undefined {
  const raw = rule.style.getPropertyValue(key)
  if (raw === '') return undefined
  return raw.replace(/['"]/g, '').trim()
}

export function readDomTheme() {
  const themeList: Theme[] = []
  const configNode = document.querySelector<HTMLStyleElement>(`style#${configStyleId}`)
  if (!configNode?.sheet) {
    throw new Error(`CRITICAL: <style id="${configStyleId}"> not found or missing sheet. Cannot discover themes.`)
  }
  const configSheet = configNode.sheet

  if (configSheet.cssRules.length === 0) {
    throw new Error(
      `CRITICAL: No CSS rules found in the '${configStyleId}' stylesheet. Ensure it contains valid theme definitions.`
    )
  }

  for (const rule of Array.from(configSheet.cssRules)) {
    if (!(rule instanceof CSSStyleRule) || !rule.selectorText) continue

    const name = parseCSSStyleValue(rule, '--name')
    if (!name) continue

    const palette = {} as Palette
    const missing: string[] = []
    for (const role of PALETTE_ROLES) {
      const value = parseCSSStyleValue(rule, `--${role}`)
      if (value === undefined) missing.push(role)
      palette[role] = value ?? ''
    }
    if (missing.length > 0) {
      console.warn(
        `Theme "${name}" is missing palette role(s): ${missing.join(', ')}. var(--${missing[0]}) will resolve to empty.`
      )
    }

    themeList.push({ name, palette })
  }

  if (themeList.length === 0) {
    throw new Error(
      `CRITICAL: No themes found in the '${configStyleId}' stylesheet. Ensure it contains valid theme definitions.`
    )
  }

  const storedThemeName = localStorage.getItem(localStorageKey)
  let theme = themeList[0]

  if (storedThemeName) {
    const matchedTheme = themeList.find(t => t.name === storedThemeName)
    if (matchedTheme) {
      theme = matchedTheme
    } else {
      console.warn(
        `Stored theme "${storedThemeName}" not found in the list of available themes. Falling back to the first theme in the list.`
      )
    }
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (prefersDark) {
      const darkTheme = themeList.find(t => t.name.includes('dark'))
      if (darkTheme) {
        theme = darkTheme
      } else {
        console.warn('System preferred dark theme not found. Falling back to the first theme in the list.')
      }
    }
  }

  return { themeList, theme }
}

export function applyTheme(themeList: Theme[], theme: Theme): void {
  const matchedTheme = themeList.find(t => t.name === theme.name)

  if (!matchedTheme) {
    throw new Error(
      `Theme "${theme.name}" not found in the list of available themes. Available themes: ${themeList.map(t => t.name).join(', ')}`
    )
  }

  writeTheme(themeList, matchedTheme)

  const body = document.body
  if (!body) {
    throw new Error('CRITICAL: No <body> element found. Cannot apply theme.')
  }

  for (const t of themeList) body.classList.remove(t.name)
  body.classList.add(theme.name)
}

export function setTheme(themeList: Theme[], theme: Theme): void {
  applyTheme(themeList, theme)
  localStorage.setItem(localStorageKey, theme.name)
}
