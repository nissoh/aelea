
import type * as monaco from 'monaco-editor'
import type { editor } from 'monaco-editor'



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

export async function loadMonaco(
  container: HTMLElement,
  config?: editor.IStandaloneEditorConstructionOptions,
  override?: editor.IEditorOverrideServices) {
  // @ts-ignore
  const monacoGlobalQuery: Promise<typeof monaco> = import(/* webpackIgnore: true */'https://cdn.skypack.dev/pin/monaco-editor@v0.22.3-8bUdTC8uNxBs1vrhFueX/mode=imports,min/optimized/monaco-editor.js')
  const pastelThemeQuery = import('./pastelTheme')

  const monacoGlobal = await monacoGlobalQuery


  // const shadowRoot = container.attachShadow({ mode: 'closed' })
  const editorElement = document.createElement('div')


  container.appendChild(editorElement)
  // shadowRoot.appendChild(editorElement)

  monacoGlobal.languages.typescript.typescriptDefaults.setCompilerOptions({
    ...monacoGlobal.languages.typescript.typescriptDefaults.getCompilerOptions(),
    module: monacoGlobal.languages.typescript.ModuleKind.ESNext,
    moduleResolution: monacoGlobal.languages.typescript.ModuleResolutionKind.NodeJs
  });

  const theme: editor.IStandaloneThemeData = {
    ...(await pastelThemeQuery).default,
    base: "vs-dark"
  }

  monacoGlobal.editor.defineTheme('pastel', theme)

  const ops: editor.IStandaloneEditorConstructionOptions = {
    theme: 'pastel',
    "semanticHighlighting.enabled": true,
    minimap: {
      enabled: false
    },
    // highlightActiveIndentGuide: false,
    // lineDecorationsWidth: 0,
    // hideCursorInOverviewRuler: true,
    // overviewRulerBorder: false,
    overviewRulerLanes: 0,

    lineNumbers: 'off',
    glyphMargin: false,
    folding: false,
    // Undocumented see https://github.com/Microsoft/vscode/issues/30795#issuecomment-410998882
    lineDecorationsWidth: 15,
    lineNumbersMinChars: 0,
    hover: {
      delay: 0
    },

    padding: {
      top: 16,
      bottom: 16
    },
    renderLineHighlight: 'none',
    renderIndentGuides: false,
    automaticLayout: true,
    scrollBeyondLastLine: false,
    ...config,
  }


  const instance = monacoGlobal.editor.create(editorElement, ops, override)

  const updateHeight = () => {
    const contentHeight = Math.min(400, instance.getContentHeight())
    editorElement.style.height = `${contentHeight}px`
    instance.layout({ width: editorElement.clientWidth, height: contentHeight })
  }

  instance.onDidContentSizeChange(updateHeight)


  return { instance, monacoGlobal }
}

