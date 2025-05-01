import { applyTheme, readDomTheme } from './domThemeLoader.js'
// biome-ignore lint/performance/noBarrelFile: <explanation>
export { setTheme } from './domThemeLoader.js'

const { theme, themeList } = readDomTheme()

applyTheme(themeList, theme)
