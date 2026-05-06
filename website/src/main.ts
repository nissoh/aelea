import { render } from 'aelea/ui'
import { applyTheme, readDomTheme, setTheme } from 'aelea/ui-components-theme-browser'
import $Website from './pages/$Website'

const { themeList, theme } = readDomTheme()
applyTheme(themeList, theme)

render({
  rootAttachment: document.body,
  $rootNode: $Website()({})
})

export { setTheme }
