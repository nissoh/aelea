export { setTheme } from 'aelea/ui-components-theme-browser'

import { $createRoot, createDomScheduler, type IRunEnvironment } from 'aelea/core'
import $Website from './pages/$Website'

const browserScheduler = createDomScheduler()
const config: IRunEnvironment = {
  namespace: '•',
  stylesheet: new CSSStyleSheet(),
  cache: [],
  rootAttachment: document.querySelector('html')!,
  scheduler: browserScheduler,
  $rootNode: $Website({ baseRoute: '' })({})
}

document.adoptedStyleSheets = [...document.adoptedStyleSheets, config.stylesheet]

$createRoot(config).run(
  {
    end() {
      console.log('Application has ended.')
    },
    error(err: Error) {
      console.error('An error occurred:', err)
    },
    event() {
      // Handle events if necessary
    }
  },
  browserScheduler
)
