import type { Scheduler } from 'aelea/stream'

export { setTheme } from 'aelea/ui-components-theme-browser'

import { type IRunEnvironment, run } from 'aelea/core'
import $Website from './pages/$Website'

export const scheduler: Scheduler = {
  schedule(callback: (...args: any[]) => void, delay: number, ...args: any[]): Disposable {
    const timeoutId = setTimeout(callback, delay, ...args)
    return {
      [Symbol.dispose]() {
        clearTimeout(timeoutId)
      }
    }
  },
  immediate(callback: (...args: any[]) => void, ...args: any[]): Disposable {
    const timeoutId = setImmediate(callback, ...args)
    return {
      [Symbol.dispose]() {
        clearImmediate(timeoutId)
      }
    }
  },
  currentTime: () => performance.now()
}

const config: IRunEnvironment = {
  namespace: '•',
  stylesheet: new CSSStyleSheet(),
  cache: [],
  rootAttachment: document.querySelector('html')!,
  scheduler,
  $rootNode: $Website({ baseRoute: '' })({})
}

document.adoptedStyleSheets = [...document.adoptedStyleSheets, config.stylesheet]

run(config).run(scheduler, {
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
