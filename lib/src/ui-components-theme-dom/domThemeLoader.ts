import { Theme } from "../ui-components-theme"

const prefix = 'aelea-'
const localStorageKey = '__AELEA_THEME__'

export function loadTheme() {
  const themeList: string[] = []
  const bodySelectorPrefix = `body.${prefix}`
  const configSheetName = 'aelea-theme-config'
  const styleSheets = Array.from(document.styleSheets)
  const configSheet = styleSheets.find(sheet =>
    sheet.ownerNode instanceof Element && sheet.ownerNode.getAttribute('name') === configSheetName
  )

  if (!configSheet) {
    throw new Error(`CRITICAL: Stylesheet with name="${configSheetName}" not found. Cannot discover themes.`)
  }

  if (!configSheet.cssRules || !(configSheet.cssRules instanceof CSSRuleList) || configSheet.cssRules.length === 0) {
    throw new Error(`CRITICAL: No CSS rules found in the '${configSheetName}' stylesheet. Ensure it contains valid theme definitions.`)
  }

  try {
    for (const rule of Array.from(configSheet.cssRules)) {
      if (rule instanceof CSSStyleRule && rule.selectorText) {
        const selector = rule.selectorText

        if (selector.startsWith(bodySelectorPrefix)) {
          const potentialName = selector.substring(bodySelectorPrefix.length)

          if (potentialName && /^[a-zA-Z0-9-]+$/.test(potentialName)) {
            if (!themeList.includes(potentialName)) {
              themeList.push(potentialName)
            }
          }
        }
      }
    }
  } catch (e) {
    throw new Error(`CRITICAL: Could not read rules from the '${configSheetName}' stylesheet. Ensure it's accessible and contains valid theme definitions. Error: ${e}`)
  }


  if (themeList.length === 0) {
    throw new Error(`CRITICAL: No theme definitions found matching the '${bodySelectorPrefix}' prefix in the CSS sheet named '${configSheetName}'. Application cannot initialize themes.`)
  }

  const storedThemeName = localStorage.getItem(localStorageKey)
  let themeName = themeList[0]

  if (storedThemeName) {
    if (themeList.includes(storedThemeName)) {
      themeName = storedThemeName
    } else {
      console.warn(`Stored theme "${storedThemeName}" not found in the list of available themes. Falling back to the first theme in the list.`)
    }
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (prefersDark) {
      const darkTheme = themeList.find(name => name.includes('dark'))
      if (darkTheme) {
        themeName = darkTheme
      } else {
        console.warn(`System prefered dark theme not found. Falling back to the first theme in the list.`)
      }
    }
  }

  applyTheme(themeList, themeName)

  const theme = getCurrentTheme()

  return { themeList, theme }
}


export function getCurrentTheme(): Theme {
  const styles = getComputedStyle(document.documentElement)
  return {
    name: styles.getPropertyValue('--theme-name').replace(/['"]/g, '').trim(),
    pallete: {
      primary: styles.getPropertyValue('--theme-aelea-primary').trim(),
      message: styles.getPropertyValue('--theme-aelea-message').trim(),
      background: styles.getPropertyValue('--theme-aelea-background').trim(),
      horizon: styles.getPropertyValue('--theme-aelea-horizon').trim(),
      middleground: styles.getPropertyValue('--theme-aelea-middleground').trim(),
      foreground: styles.getPropertyValue('--theme-aelea-foreground').trim(),
      positive: styles.getPropertyValue('--theme-aelea-positive').trim(),
      negative: styles.getPropertyValue('--theme-aelea-negative').trim(),
      indeterminate: styles.getPropertyValue('--theme-aelea-indeterminate').trim(),
    }
  }
}
function applyTheme(themeList: string[], themeName: string): void {
  const matchedTheme = themeList.includes(themeName)

  if (!matchedTheme) {
    throw new Error(`Theme "${themeName}" not found in the list of available themes. Available themes: ${themeList.join(', ')}`)
  }

  const body = document.body

  themeList.forEach(name => {
    body.classList.remove(prefix + name)
  })

  body.classList.add(prefix + themeName)

  document.documentElement.style.setProperty('--theme-name', themeName)
}

export function setTheme(themeList: string[], themeName: string): void {
  applyTheme(themeList, themeName)

  localStorage.setItem(localStorageKey, themeName)
}

