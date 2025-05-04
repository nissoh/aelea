import { runBrowser } from 'aelea/core'

export { setTheme } from 'aelea/ui-components-theme-browser'

import $Website from './pages/$Website'

runBrowser({ rootNode: document.body })($Website({ baseRoute: '' })({}))
