import { runBrowser } from 'aelea/core'
// biome-ignore lint/performance/noBarrelFile: effective applies the theme by loading this module
export { setTheme } from 'aelea/ui-components-theme-browser'
import $Website from './pages/$Website'

runBrowser({ rootNode: document.body })($Website({ baseRoute: '' })({}))
