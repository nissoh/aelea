export { setTheme } from 'aelea/ui-components-theme-browser'

import { $createRoot, type IRunEnvironment } from 'aelea/core'
import $Website from './pages/$Website'
import { browserScheduler } from './scheduler'

const config: IRunEnvironment = {
  namespace: '•',
  stylesheet: new CSSStyleSheet(),
  cache: [],
  rootAttachment: document.querySelector('html')!,
  scheduler: browserScheduler,
  $rootNode: $Website({ baseRoute: '' })({})
}

document.adoptedStyleSheets = [...document.adoptedStyleSheets, config.stylesheet]

$createRoot(config).run(browserScheduler, {
  end() {
    console.log('Application has ended.')
  },
  error(err: Error) {
    console.error('An error occurred:', err)
  },
  event() {
    // Handle events if necessary
  }
})
