import { render } from 'aelea/ui'
import { applyTheme, readDomTheme } from 'aelea/ui-components-theme-browser'
import { $Landing } from './$Landing'

const { themeList, theme } = readDomTheme()
applyTheme(themeList, theme)

render({
  rootAttachment: document.body,
  $rootNode: $Landing
})
