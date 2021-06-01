
import type { Theme } from "@aelea/ui-components-theme"
import { dark, light } from "./common/theme"

const THEME_PALLETE_SELECTED_KEY = `!!THEME_PALLETE_SELECTED_KEY`
const themeFromStorage = localStorage.getItem(THEME_PALLETE_SELECTED_KEY)
const themeList = [dark, light]

function setTheme<T extends Theme>(theme: T) {
  localStorage.setItem(THEME_PALLETE_SELECTED_KEY, JSON.stringify(theme))
}
const darkModePreferance = self?.matchMedia('(prefers-color-scheme: dark)').matches

if (themeFromStorage === null) {
  const defaultTheme = darkModePreferance ? light : dark

  setTheme(defaultTheme)
} else {
  const currentTheme = themeList.find(t => JSON.stringify(t) === themeFromStorage)

  if (currentTheme) {
    setTheme(currentTheme)
  } else {
    console.warn('unable to set theme, stored version seems different. reassigning local version')
    const defaultTheme = darkModePreferance ? light : dark

    setTheme(defaultTheme)
  }
  
}


