import { runBrowser } from 'aelea/core'
import type { Scheduler } from 'aelea/stream'

export { setTheme } from 'aelea/ui-components-theme-browser'

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
  currentTime: () => performance.now()
}

runBrowser(scheduler, { $rootNode: $Website({ baseRoute: '' })({}) })
