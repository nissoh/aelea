import { $text, runBrowser, style } from 'aelea/dom'
import $Website from './pages/$Website'
import { loadTheme } from 'aelea/ui-components-theme-dom'
import { $column } from 'aelea/ui-components'
import { pallete } from './theme'

loadTheme()

runBrowser({ rootNode: document.body })(
  $Website({ baseRoute: '' })({})
)