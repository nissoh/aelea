import { writeTheme } from "../ui-components-theme/globalState.js"
import type { Theme } from "../ui-components-theme/types.js"


const localStorageKey = '__AELEA_THEME__'


function parseCSSStyleValue(rule: CSSStyleRule, key: string): string | undefined {
  return rule.styleMap.get(key)?.toString().replace(/['"]/g, '').trim()
}

export function loadTheme() {
  const themeList: Theme[] = []
  const configStyleId = 'aelea-theme-config'
  // get the <style id="aelea-theme-config"> node
  const configNode = document.querySelector<HTMLStyleElement>(`style#${configStyleId}`)
  if (!configNode || !configNode.sheet) {
    throw new Error(`CRITICAL: <style id="${configStyleId}"> not found or missing sheet. Cannot discover themes.`)
  }
  // now you have your CSSStyleSheet directly
  const configSheet = configNode.sheet as CSSStyleSheet

  if (!configSheet) {
    throw new Error(`CRITICAL: Stylesheet with name="${configStyleId}" not found. Cannot discover themes.`)
  }

  if (!configSheet.cssRules || !(configSheet.cssRules instanceof CSSRuleList) || configSheet.cssRules.length === 0) {
    throw new Error(`CRITICAL: No CSS rules found in the '${configStyleId}' stylesheet. Ensure it contains valid theme definitions.`)
  }

  try {
    for (const rule of Array.from(configSheet.cssRules)) {
      if (rule instanceof CSSStyleRule && rule.selectorText) {
        const name = parseCSSStyleValue(rule, '--name')

        if (name) {
          themeList.push({
            name,
            pallete: {
              primary: parseCSSStyleValue(rule, '--primary') || '',
              message: parseCSSStyleValue(rule, '--message') || '',
              background: parseCSSStyleValue(rule, '--background') || '',
              horizon: parseCSSStyleValue(rule, '--horizon') || '',
              middleground: parseCSSStyleValue(rule, '--middleground') || '',
              foreground: parseCSSStyleValue(rule, '--foreground') || '',
              positive: parseCSSStyleValue(rule, '--positive') || '',
              negative: parseCSSStyleValue(rule, '--negative') || '',
              indeterminate: parseCSSStyleValue(rule, '--indeterminate') || ''
            }
          })
        }
      }
    }
  } catch (e) {
    throw new Error(`CRITICAL: Could not read rules from the '${configStyleId}' stylesheet. Ensure it's accessible and contains valid theme definitions. Error: ${e}`)
  }

  if (themeList.length === 0) {
    throw new Error(`CRITICAL: No themes found in the '${configStyleId}' stylesheet. Ensure it contains valid theme definitions.`)
  }

  const storedThemeName = localStorage.getItem(localStorageKey)
  let theme = themeList[0]

  if (storedThemeName) {
    const matchedTheme = themeList.find(name => name.name === storedThemeName)
    if (matchedTheme) {
      theme = matchedTheme
    } else {
      console.warn(`Stored theme "${storedThemeName}" not found in the list of available themes. Falling back to the first theme in the list.`)
    }
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (prefersDark) {
      const darkTheme = themeList.find(theme => theme.name.includes('dark'))
      if (darkTheme) {
        theme = darkTheme
      } else {
        console.warn('System prefered dark theme not found. Falling back to the first theme in the list.')
      }
    }
  }

  applyTheme(themeList, theme)
  // const domComputedTheme = getCurrentTheme()
  // const theme = writeTheme(domComputedTheme)

  return { themeList, theme }
}


export function getCurrentTheme(): Theme {
  const styles = getComputedStyle(document.documentElement)
  return {
    name: styles.getPropertyValue('--name').replace(/['"]/g, '').trim(),
    pallete: {
      primary: styles.getPropertyValue('--primary').trim(),
      message: styles.getPropertyValue('--message').trim(),
      background: styles.getPropertyValue('--background').trim(),
      horizon: styles.getPropertyValue('--horizon').trim(),
      middleground: styles.getPropertyValue('--middleground').trim(),
      foreground: styles.getPropertyValue('--foreground').trim(),
      positive: styles.getPropertyValue('--positive').trim(),
      negative: styles.getPropertyValue('--negative').trim(),
      indeterminate: styles.getPropertyValue('--indeterminate').trim(),
    }
  }
}
function applyTheme(themeList: Theme[], theme: Theme): void {
  const matchedTheme = themeList.find(name => name.name === theme.name)


  if (!matchedTheme) {
    throw new Error(`Theme "${theme.name}" not found in the list of available themes. Available themes: ${themeList.map(x => x.name).join(', ')}`)
  }

  writeTheme(matchedTheme)

  const body = document.body

  for (const theme of themeList) {
    body.classList.remove(theme.name)
  }

  body.classList.add(theme.name)

  // document.documentElement.style.setProperty('--name', theme.name)
}

export function setTheme(themeList: Theme[], theme: Theme): void {
  applyTheme(themeList, theme)

  localStorage.setItem(localStorageKey, theme.name)
}

