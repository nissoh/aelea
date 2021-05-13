
import { Behavior, component, fromCallback, IBranch, O, style, $wrapNativeElement, StyleCSS, $node } from '@aelea/core'
import { at, awaitPromises, combine, continueWith, delay, empty, filter, fromPromise, join, map, merge, multicast, now, recoverWith, skipRepeatsWith, startWith, switchLatest, take } from '@most/core'
import { Stream } from '@most/types'
import type * as monaco from 'monaco-editor'
import layoutSheet from '../style/layoutSheet'
import * as observer from '../utils/elementObservers'



const fetchJson = async <T>(input: RequestInfo, init?: RequestInit): Promise<T> => (await fetch(input, init)).json()

interface JSDelivrFlat {
  files: JSDelivrMeta[]
  default: string
}

interface JSDelivrMeta {
  hash: string
  name: string
  size: number
  time: string
}

type PackageFile = {
  content: string
} & JSDelivrMeta


type PackageJsonDependencies = { [version: string]: string }




export type Package = {
  name: string
  version: string
  typings?: string
  files: PackageFile[]
}

export type PackageJson = {
  name: string
  version: string
  typings?: string
  files: PackageFile[]
  dependencies: PackageJsonDependencies
} & Package

export type PackageTree = {
  dependencies: PackageTree[]
} & Package


const fetchMeta = (dependency: string, version: string): Promise<JSDelivrFlat> =>
  fetchJson(`https://data.jsdelivr.com/v1/package/npm/${dependency}@${version}/flat`)



const packageQueryCache = new Map<string, Promise<PackageJson>>()
const packageLocalCache = new Map<string, PackageJson>()

async function cacheGet(key: string, queryStore: () => Promise<PackageJson>): Promise<PackageJson> {
  const locallyStoredItem = packageLocalCache.get(key)

  if (locallyStoredItem)
    return locallyStoredItem

  const storedItem = localStorage.getItem(key)

  if (storedItem) {
    const parsedItem: PackageJson = JSON.parse(storedItem)
    packageLocalCache.set(key, parsedItem)
    return parsedItem
  }

  const pendingQuery = packageQueryCache.get(key)

  if (pendingQuery)
    return pendingQuery

  const query = queryStore()

  packageQueryCache.set(key, query)

  const resp = await query

  packageLocalCache.set(key, resp)
  localStorage.setItem(key, JSON.stringify(resp))

  return resp
}

export async function fetchFileListContent(name: string, version = 'latest') {
  const meta = (await fetchMeta(name, version)).files

  let dtsFiles: JSDelivrMeta[] = meta.filter(metaFile => /\.d\.ts$/.test(metaFile.name))

  if (dtsFiles.length === 0) {
    // if no .d.ts files found, fallback to .ts files
    dtsFiles = meta.filter(metaFile => /\.ts$/.test(metaFile.name))
  }

  if (dtsFiles.length === 0) {
    throw new Error('No inline typings found.')
  }

  const dtsQueries = dtsFiles.map(async (file): Promise<PackageFile> => {
    const content: string = await fetch(`https://cdn.jsdelivr.net/npm/${name}@${version}${file.name}`).then(r => r.text())

    return { ...file, content: content.replace(/(} from '@)/g, `} from '%40`) }
  })

  return Promise.all(dtsQueries)
}

export async function fetchAndCacheDependancyTree(name: string, version = 'latest'): Promise<PackageTree> {
  const pkgPath = `https://cdn.jsdelivr.net/npm/${name}@${version}/package.json`

  const pkg = await cacheGet(pkgPath, async () => {
    const pkgJson: { dependencies: PackageJsonDependencies, typings?: string, types?: string } = await fetchJson(pkgPath)
    const dependencies = pkgJson?.dependencies ?? {}
    const files = await fetchFileListContent(name, version)
    const typings = pkgJson.typings ?? pkgJson.types

    return { files, dependencies, name, version, typings }
  })

  const depsQueries = Object.entries(pkg.dependencies).map(([pkgName, version]) =>
    fetchAndCacheDependancyTree(pkgName, version.replace(/[\^*]/, ''))
  )

  const dependencies = await Promise.all(depsQueries)

  return { ...pkg, dependencies }
}

export function defineModel(pkg: PackageTree, monacoGlobal: typeof monaco) {
  const pkgModelUri = monacoGlobal.Uri.parse(`file://root/node_modules/${pkg.name}/package.json`)
  const model = monacoGlobal.editor.getModel(pkgModelUri)

  if (!model) {
    const dependencies = Object.entries(pkg.dependencies).reduce(((acc, [key, val]) => ({ ...acc, [key.replace(/^@/, `%40`)]: val })), {}) // https://github.com/microsoft/monaco-editor/issues/1306
    const pakgDefJsonStr = JSON.stringify({
      name: pkg.name,
      version: pkg.version,
      typings: pkg.typings,
      dependencies
    })
    monacoGlobal.editor.createModel(pakgDefJsonStr, "typescript", pkgModelUri)

    pkg.files.forEach(file => {
      monacoGlobal.editor.createModel(file.content, "typescript", monacoGlobal.Uri.parse(`file://root/node_modules/${pkg.name}${file.name}`))
    })
  }
}

export function definePackageTree(pkg: PackageTree, monacoGlobal: typeof monaco) {
  defineModel(pkg, monacoGlobal)
  pkg.dependencies.forEach(pkg => {
    definePackageTree(pkg, monacoGlobal)
  })
}




const whitespaceRegexp = /[\n\r\s\t]+/g

const elementBecameVisibleEvent = O(
  observer.intersection(),
  filter(intersectionEvent => intersectionEvent[0].intersectionRatio > 0),
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
  const precacheAeleaDependanciesQuery = fetchAndCacheDependancyTree('@aelea/core', '0.11.0')
  // @ts-ignore
  const codiConQuery: Promise<any> = new FontFace('codicon', `url('https://cdn.jsdelivr.net/npm/monaco-editor@0.23.0/min/vs/base/browser/ui/codicons/codicon/codicon.ttf')`)

  const monacoGlobal = await monacoQuery
  const codiConFont = await codiConQuery

  const pkg = await precacheAeleaDependanciesQuery

  definePackageTree(pkg, monacoGlobal)

  // @ts-ignore
  document.fonts.add(codiConFont)

  return { monacoGlobal, pkg }
}



let monacoQuery: null | Promise<any> = null

export async function loadMonacoTSEditor(): ReturnType<typeof asyncloadMonacoEditor> {
  if (monacoQuery)
    return monacoQuery

  monacoQuery = asyncloadMonacoEditor()

  return monacoQuery
}



export interface ModelChangeBehavior {
  node: HTMLElement
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
  override?: monaco.editor.IEditorOverrideServices,
  containerStyle?: StyleCSS
}

export const $MonacoEditor = ({ code, config, override, containerStyle = { flex: 1 } }: IMonacoEditor) => component((
  [change, changeTether]: Behavior<IBranch<HTMLElement>, ModelChangeBehavior>
) => {
 
  
  const editorload = fromPromise(loadMonacoTSEditor())
                                

  const $editor = map(({ monacoGlobal }) => {
    const editorElement = document.createElement('div')

    monacoGlobal.languages.typescript.typescriptDefaults.setCompilerOptions({
      ...monacoGlobal.languages.typescript.typescriptDefaults.getCompilerOptions(),
      module: monacoGlobal.languages.typescript.ModuleKind.ESNext,
      moduleResolution: monacoGlobal.languages.typescript.ModuleResolutionKind.NodeJs
    })



    const model = monacoGlobal.editor.createModel(
      code.replace(/(} from '@)/g, `} from '%40`),
      "typescript",
      monacoGlobal.Uri.parse(`file://root/test${++monacoEntryFileId}.ts`)
    )

    const ops: monaco.editor.IStandaloneEditorConstructionOptions = {
      theme: 'vs-dark',
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
      scrollBeyondLastLine: false,
      automaticLayout: false,
      model,
      ...config,
    }


    const instance = monacoGlobal.editor.create(editorElement, ops, override)


      
    const updateHeight = () => {
      if (ops.automaticLayout) {
        const contentHeight = instance.getContentHeight()
        editorElement.style.minHeight = `${contentHeight}px`
        instance.layout({ width: editorElement.clientWidth, height: contentHeight })
        instance.layout()
      } else
        instance.layout()
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
      layoutSheet.column,
      style({ ...containerStyle  }),
      changeTether(
      // ensure we load editor only when it's visible on the screen
        elementBecameVisibleEvent,
        map(async elEvents => {
          const node = elEvents[0].target as HTMLElement
 
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
    switchLatest(
      startWith($node(style(containerStyle))(), $editor)
    ),
    { change }
  ]
})

