
import type * as monaco from 'monaco-editor'

// @ts-ignore
const monacoGlobalQuery: Promise<typeof monaco> = import(/* webpackIgnore: true */'https://cdn.skypack.dev/pin/monaco-editor@v0.22.3-8bUdTC8uNxBs1vrhFueX/mode=imports,min/optimized/monaco-editor.js')


export default monacoGlobalQuery

// Before loading vs/editor/editor.main, define a global MonacoEnvironment that overwrites
// the default worker url location (used when creating WebWorkers). The problem here is that
// HTML5 does not allow cross-domain web workers, so we need to proxy the instantiation of
// a web worker through a same-domain script
// @ts-ignore
window.MonacoEnvironment = {
  getWorkerUrl: function () {
    return `data:text/javascriptcharset=utf-8,${encodeURIComponent(`
        self.MonacoEnvironment = {
          baseUrl: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.22.3/min/'
        }
        importScripts('https://cdn.jsdelivr.net/npm/monaco-editor@0.22.3/min/vs/base/worker/workerMain.js')`
    )}`
  }
}


// move unto PWA web worker
window.addEventListener('activate', event => {

  // @ts-ignore
  event.waitUntil(clients.claim())
})

window.addEventListener('fetch', (event) => {
  // @ts-ignore
  if (event.request.url.endsWith('codicon.ttf')) {
    // @ts-ignore
    event.respondWith(
      fetch('https://unpkg.com/monaco-editor@0.21.2/esm/vs/base/browser/ui/codicons/codicon/codicon.ttf')
    )
  }
})
