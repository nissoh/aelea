export { setTheme } from 'aelea/ui-components-theme-browser'

import { render } from 'aelea/ui'
import $Website from './pages/$Website'

render({
  rootAttachment: document.querySelector('html')!,
  $rootNode: $Website({ baseRoute: '' })({})
})
