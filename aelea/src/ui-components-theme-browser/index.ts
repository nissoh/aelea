import { applyTheme, readDomTheme } from './domThemeLoader.js'

// biome-ignore lint/performance/noBarrelFile: entrypoint module
export { setTheme } from './domThemeLoader.js'

const { theme, themeList } = readDomTheme()

applyTheme(themeList, theme)
