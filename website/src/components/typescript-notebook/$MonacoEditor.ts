
import { Behavior, component, fromCallback, IBranch, O, style, $wrapNativeElement } from '@aelea/core'
import { $column, layoutSheet } from '@aelea/ui-components'
import { at, awaitPromises, combine, constant, continueWith, delay, empty, filter, fromPromise, join, map, merge, multicast, now, recoverWith, skipRepeatsWith, switchLatest, take } from '@most/core'
import { Stream } from '@most/types'
import type * as monaco from 'monaco-editor'
import { intersectionObserverEvent } from '../../common/utils'
import { definePackageTree, fetchAndCacheDependancyTree } from './fetchPackageDts'



const whitespaceRegexp = /[\n\r\s\t]+/g

const elementBecameVisibleEvent = O(
  intersectionObserverEvent,
  filter(cond => cond.intersectionRatio > 0),
  take(1)
)

// Before loading vs/editor/editor.main, define a global MonacoEnvironment that overwrites
// the default worker url location (used when creating WebWorkers). The problem here is that
// HTML5 does not allow cross-domain web workers, so we need to proxy the instantiation of
// a web worker through a same-domain script
// @ts-ignore
window.MonacoEnvironment = {
  getWorkerUrl: function () {
    return `data:text/javascriptcharset=utf-8,${encodeURIComponent(`
        self.MonacoEnvironment = {
          baseUrl: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.23.0/min/'
        }
        importScripts('https://cdn.jsdelivr.net/npm/monaco-editor@0.23.0/min/vs/base/worker/workerMain.js')`
    )}`
  }
}



export async function asyncloadMonacoEditor() {
  // @ts-ignore
  const monacoQuery: Promise<typeof monaco> = import(/* webpackIgnore: true */'https://cdn.skypack.dev/pin/monaco-editor@v0.23.0-nVyIshjiDqruq90zejl0/mode=imports,min/optimized/monaco-editor.js')
  const precacheAeleaDependanciesQuery = fetchAndCacheDependancyTree('@aelea/core', '0.6.0')
  const pastelThemeQuery = import('./pastelTheme')
  // @ts-ignore
  const codiConQuery: Promise<any> = new FontFace('codicon', `url('https://cdn.jsdelivr.net/npm/monaco-editor@0.23.0/min/vs/base/browser/ui/codicons/codicon/codicon.ttf')`)

  const monacoGlobal = await monacoQuery
  const codiConFont = await codiConQuery

  const pastelTheme = (await pastelThemeQuery).default
  const pkg = await precacheAeleaDependanciesQuery

  definePackageTree(pkg, monacoGlobal)

  // @ts-ignore
  document.fonts.add(codiConFont)

  return { monacoGlobal, pastelTheme, pkg }
}



let monacoQuery: null | Promise<any> = null

export async function loadMonacoTSEditor(): ReturnType<typeof asyncloadMonacoEditor> {
  if (monacoQuery)
    return monacoQuery

  monacoQuery = asyncloadMonacoEditor()

  return monacoQuery
}



export interface ModelChangeBehavior {
  node: IBranch<HTMLElement>
  instance: monaco.editor.IStandaloneCodeEditor
  monacoGlobal: typeof monaco
  model: monaco.editor.ITextModel
  semanticDiagnostics: monaco.languages.typescript.Diagnostic[]
  syntacticDiagnostics: monaco.languages.typescript.Diagnostic[]
  modelChange: string
  worker: monaco.languages.typescript.TypeScriptWorker
}


let monacoEntryFileId = 0

export interface IMonacoEditor {
  code: string,
  // monacoGlobal: typeof monaco,
  config?: monaco.editor.IStandaloneEditorConstructionOptions,
  override?: monaco.editor.IEditorOverrideServices
}

export const $MonacoEditor = ({code, config, override}: IMonacoEditor) => component((
  [sampleChange, change]: Behavior<IBranch<HTMLElement>, ModelChangeBehavior>
) => {
 
  
  const editorload = fromPromise(loadMonacoTSEditor())
                                
  const initalCodeBlockHeight = 24 + 20 + (code.split('\n').length * 18)

  const $editor = map(({ monacoGlobal, pastelTheme, pkg }) => {
    // const shadowRoot = container.attachShadow({ mode: 'closed' })
    const editorElement = document.createElement('div')

    // container.appendChild(editorElement)
    // shadowRoot.appendChild(editorElement)

    monacoGlobal.languages.typescript.typescriptDefaults.setCompilerOptions({
      ...monacoGlobal.languages.typescript.typescriptDefaults.getCompilerOptions(),
      module: monacoGlobal.languages.typescript.ModuleKind.ESNext,
      moduleResolution: monacoGlobal.languages.typescript.ModuleResolutionKind.NodeJs
    });

    const theme: monaco.editor.IStandaloneThemeData = {
      ...pastelTheme,
      base: "vs-dark"
    }

    monacoGlobal.editor.defineTheme('pastel', theme)

    const model = monacoGlobal.editor.createModel(
      code.replace(/(} from '@)/g, `} from '%40`),
      "typescript",
      monacoGlobal.Uri.parse(`file://root/test${++monacoEntryFileId}.ts`)
    )

    const ops: monaco.editor.IStandaloneEditorConstructionOptions = {
      theme: 'pastel',
      "semanticHighlighting.enabled": true,
      minimap: { enabled: false },
      overviewRulerLanes: 0,
      lineNumbers: 'off',
      glyphMargin: false,
      folding: false,
      lineDecorationsWidth: 15,
      lineNumbersMinChars: 0,
      hover: { delay: 0 },
      padding: { top: 16, bottom: 16 },
      renderLineHighlight: 'none',
      renderIndentGuides: false,
      automaticLayout: true,
      scrollBeyondLastLine: false,
      model,
      ...config,
    }


    const instance = monacoGlobal.editor.create(editorElement, ops, override)

    const updateHeight = () => {
      const contentHeight = instance.getContentHeight()
      editorElement.style.height = `${contentHeight}px`
      instance.layout({ width: editorElement.clientWidth, height: contentHeight })
    }

    instance.onDidContentSizeChange(updateHeight)

    type Awaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T;

    let attempDuration = 50

    const getWorkerStream: Stream<Awaited<ReturnType<typeof monacoGlobal.languages.typescript.getTypeScriptWorker>>> = O(
      continueWith(() => {
        return fromPromise(monacoGlobal.languages.typescript.getTypeScriptWorker())
      }),
      recoverWith(err => {
        console.error(err)
        attempDuration += 100
        return join(at(attempDuration, getWorkerStream))
      })
    )(empty())


    const $editor = $wrapNativeElement(editorElement)(O(
      layoutSheet.flex, layoutSheet.column,
      sampleChange(
      // ensure we load editor only when it's visible on the screen
        map(node => {
          return constant(node, elementBecameVisibleEvent(node.element))
        }),
        switchLatest,
        map(async node => {

 
          const modelChangeWithDelay = delay(10, fromCallback(model.onDidChangeContent, model)) // delay is required because change emits an event before diagnostics and other stuff are finished
          const editorChanges = map(() => model.getValue(), modelChangeWithDelay)
          const changesWithInitial = merge(now(model.getValue()), editorChanges)
          const ignoreWhitespaceChanges = skipRepeatsWith((prev, next) =>
            prev.replace(whitespaceRegexp, '') === next.replace(whitespaceRegexp, '')
          , changesWithInitial)


          const tsModelChanges = awaitPromises(
            combine(async (modelChange, getWorker): Promise<ModelChangeBehavior> => {
              const worker = await getWorker(model.uri)
              const semanticDiagnosticsQuery = worker.getSemanticDiagnostics(model.uri.toString())
              const syntacticDiagnosticsQuery = worker.getSyntacticDiagnostics(model.uri.toString())
              const semanticDiagnostics = await semanticDiagnosticsQuery
              const syntacticDiagnostics = await syntacticDiagnosticsQuery

              return { node, instance, monacoGlobal, worker, model, modelChange, semanticDiagnostics, syntacticDiagnostics }
            }, ignoreWhitespaceChanges, getWorkerStream)
          )
        
          return tsModelChanges
        }),
        awaitPromises,
        join,
        multicast
      ),
    ))()
          
    const disposeMonacoStub: Stream<never> = { run: () => instance }

    return merge($editor, disposeMonacoStub)
  }, editorload)



  return [
    $column(style({minHeight: initalCodeBlockHeight + 'px'}))(
      join($editor)
    ),
    {change}
  ]
})

