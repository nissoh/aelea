import { $text, runBrowser } from 'aelea/core'
import { scheduler } from 'aelea/stream'

export { setTheme } from 'aelea/ui-components-theme-browser'

import { $row } from 'aelea/ui-components'

runBrowser(scheduler, { $rootNode: $row($text('Welcome to Aelea!')) })
// runBrowser(scheduler, { $rootNode: $Website({ baseRoute: '' })({}) })
