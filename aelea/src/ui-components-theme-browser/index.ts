import { applyTheme, readDomTheme } from './domThemeLoader.js'

export { setTheme } from './domThemeLoader.js'

const { theme, themeList } = readDomTheme()

applyTheme(themeList, theme)
