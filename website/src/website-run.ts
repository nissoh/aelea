import { runBrowser } from 'aelea/dom'
import $Website from './pages/$Website'
import { loadTheme } from 'aelea/ui-components-theme-dom'

loadTheme()

runBrowser({ rootNode: document.body })(
  $Website({ baseRoute: '' })({})
)