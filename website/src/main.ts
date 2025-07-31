import { runBrowser } from 'aelea/core'
import { scheduler } from 'aelea/stream'

export { setTheme } from 'aelea/ui-components-theme-browser'

import $Website from './pages/$Website'

runBrowser(scheduler, { $rootNode: $Website({ baseRoute: '' })({}) })
