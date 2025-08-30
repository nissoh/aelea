import {
  combine,
  continueWith,
  delay,
  empty,
  filter,
  fromCallback,
  fromPromise,
  type IStream,
  merge,
  now,
  o,
  skipRepeatsWith,
  switchMap,
  tap
} from 'aelea/stream'
import { fetchJson, type IBehavior } from 'aelea/stream-extended'
import { $wrapNativeElement, component, type INode, type IStyleCSS, style } from 'aelea/ui'
import { observer } from 'aelea/ui-components'
import type * as monaco from 'monaco-editor'

// Monaco will be loaded dynamically from CDN
declare global {
  interface Window {
    monaco: typeof monaco
    require: any
  }
}

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

  if (locallyStoredItem) return locallyStoredItem

  const storedItem = localStorage.getItem(key)

  if (storedItem) {
    const parsedItem: PackageJson = JSON.parse(storedItem)
    packageLocalCache.set(key, parsedItem)
    return parsedItem
  }

  const pendingQuery = packageQueryCache.get(key)

  if (pendingQuery) return pendingQuery

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
    const content: string = await fetch(`https://cdn.jsdelivr.net/npm/${name}@${version}${file.name}`).then(r =>
      r.text()
    )

    return { ...file, content: content.replace(/(} from '@)/g, `} from '%40`) }
  })

  return Promise.all(dtsQueries)
}

export async function fetchAndCacheDependancyTree(name: string, version = 'latest'): Promise<PackageTree> {
  const pkgPath = `https://cdn.jsdelivr.net/npm/${name}@${version}/package.json`

  const pkg = await cacheGet(pkgPath, async () => {
    const pkgJson: {
      dependencies: PackageJsonDependencies
      typings?: string
      types?: string
    } = await fetchJson(pkgPath)
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
    const dependencies = Object.entries(pkg.dependencies).reduce(
      (acc, [key, val]) => ({ ...acc, [key.replace(/^@/, '%40')]: val }),
      {}
    ) // https://github.com/microsoft/monaco-editor/issues/1306
    const pakgDefJsonStr = JSON.stringify({
      name: pkg.name,
      version: pkg.version,
      typings: pkg.typings,
      dependencies
    })
    monacoGlobal.editor.createModel(pakgDefJsonStr, 'typescript', pkgModelUri)

    for (const file of pkg.files) {
      monacoGlobal.editor.createModel(
        file.content,
        'typescript',
        monacoGlobal.Uri.parse(`file://root/node_modules/${pkg.name}${file.name}`)
      )
    }
  }
}

export function definePackageTree(pkg: PackageTree, monacoGlobal: typeof monaco) {
  defineModel(pkg, monacoGlobal)
  for (const dep of pkg.dependencies) {
    definePackageTree(dep, monacoGlobal)
  }
}

const whitespaceRegexp = /[\n\r\s\t]+/g

let monacoQuery: Promise<{ monacoGlobal: typeof monaco; pkg: PackageTree }> | null = null

export async function loadMonacoTSEditor() {
  if (!monacoQuery) {
    monacoQuery = initializeMonaco()
  }
  return monacoQuery
}

async function loadMonacoFromCDN() {
  // Load Monaco Editor from CDN
  const script = document.createElement('script')
  script.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/loader.js'
  document.head.appendChild(script)

  return new Promise<typeof monaco>(resolve => {
    script.onload = () => {
      window.require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs' } })
      window.require(['vs/editor/editor.main'], () => {
        resolve(window.monaco)
      })
    }
  })
}

async function loadAeleaPackageLocally() {
  // Load aelea types from CDN (published version)
  const version = '2.2.5'
  const baseUrl = `https://cdn.jsdelivr.net/npm/aelea@${version}`

  try {
    // Fetch type definition files directly
    const [coreTypes, streamTypes, uiTypes] = await Promise.all([
      fetch(`${baseUrl}/dist/types/core/index.d.ts`).then(r => r.text()),
      fetch(`${baseUrl}/dist/types/stream/index.d.ts`).then(r => r.text()),
      fetch(`${baseUrl}/dist/types/ui-components/index.d.ts`)
        .then(r => r.text())
        .catch(() => '')
    ])

    const files: PackageFile[] = [
      {
        name: '/index.d.ts',
        content: `export * from './core/index'\nexport * from './stream/index'\nexport * from './ui-components/index'`,
        hash: '',
        size: 0,
        time: new Date().toISOString()
      },
      {
        name: '/core/index.d.ts',
        content: coreTypes,
        hash: '',
        size: coreTypes.length,
        time: new Date().toISOString()
      },
      {
        name: '/stream/index.d.ts',
        content: streamTypes,
        hash: '',
        size: streamTypes.length,
        time: new Date().toISOString()
      }
    ]

    if (uiTypes) {
      files.push({
        name: '/ui-components/index.d.ts',
        content: uiTypes,
        hash: '',
        size: uiTypes.length,
        time: new Date().toISOString()
      })
    }

    return {
      name: 'aelea',
      version,
      typings: 'index.d.ts',
      files,
      dependencies: []
    } as PackageTree
  } catch (err) {
    console.warn('Failed to load aelea types from CDN, falling back to basic types', err)
    // Fallback to minimal types
    return {
      name: 'aelea',
      version,
      typings: 'index.d.ts',
      files: [
        {
          name: '/index.d.ts',
          content: 'export {}',
          hash: '',
          size: 0,
          time: new Date().toISOString()
        }
      ],
      dependencies: []
    } as PackageTree
  }
}

async function initializeMonaco() {
  const [monacoGlobal, pkg] = await Promise.all([loadMonacoFromCDN(), loadAeleaPackageLocally()])

  // Configure TypeScript defaults for better performance
  monacoGlobal.languages.typescript.typescriptDefaults.setEagerModelSync(true)
  monacoGlobal.languages.typescript.typescriptDefaults.setCompilerOptions({
    ...monacoGlobal.languages.typescript.typescriptDefaults.getCompilerOptions(),
    module: monacoGlobal.languages.typescript.ModuleKind.ESNext,
    moduleResolution: monacoGlobal.languages.typescript.ModuleResolutionKind.NodeJs
  })

  // Load codicon font from CDN
  try {
    const codiconFont = new FontFace(
      'codicon',
      `url('https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/base/browser/ui/codicons/codicon/codicon.ttf')`
    )
    await codiconFont.load()
    ;(document.fonts as any).add(codiconFont)
  } catch (err) {
    console.warn('Failed to load codicon font:', err)
  }

  definePackageTree(pkg, monacoGlobal)
  return { monacoGlobal, pkg }
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

export interface IMonacoEditorProps {
  code: string
  config?: monaco.editor.IStandaloneEditorConstructionOptions
  override?: monaco.editor.IEditorOverrideServices
  containerStyle?: IStyleCSS
}

export const $MonacoEditor = ({ code, config, override, containerStyle = { flex: 1 } }: IMonacoEditorProps) =>
  component(([change, changeTether]: IBehavior<INode, ModelChangeBehavior>) => {
    const editorload = fromPromise(loadMonacoTSEditor())

    return [
      switchMap(({ monacoGlobal }) => {
        const editorElement = document.createElement('div')

        const model = monacoGlobal.editor.createModel(
          code.replace(/(} from '@)/g, `} from '%40`),
          'typescript',
          monacoGlobal.Uri.parse(`file://root/test${++monacoEntryFileId}.ts`)
        )

        const ops: monaco.editor.IStandaloneEditorConstructionOptions = {
          theme: 'vs-dark',
          'semanticHighlighting.enabled': true,
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
          // renderIndentGuides: false,
          scrollBeyondLastLine: false,
          automaticLayout: false,
          model,
          ...config
        }

        const instance = monacoGlobal.editor.create(editorElement, ops, override)

        const updateHeight = () => {
          if (ops.automaticLayout) {
            const contentHeight = instance.getContentHeight()
            editorElement.style.minHeight = `${contentHeight}px`
            instance.layout({
              width: editorElement.clientWidth,
              height: contentHeight
            })
            instance.layout()
          } else instance.layout()
        }

        instance.onDidContentSizeChange(updateHeight)

        const worketStream: IStream<() => Promise<monaco.languages.typescript.TypeScriptWorker>> = o(
          continueWith(() => {
            return fromPromise(monacoGlobal.languages.typescript.getTypeScriptWorker())
          })
          // recoverWith((err) => {
          //   console.error(err)
          //   attempDuration += 100
          //   return join(at(attempDuration, getWorkerStream))
          // })
        )(empty)

        const $editor = $wrapNativeElement(editorElement)(
          style({ flexDirection: 'column', ...containerStyle }),
          changeTether(
            tap(x => {
              return x
            }),
            // ensure we load editor only when it's visible on the screen
            observer.intersection(),
            filter(intersectionEvent => {
              return intersectionEvent[0].intersectionRatio > 0
            }),
            switchMap(elEvents => {
              const node = elEvents[0].target as HTMLElement

              const modelChangeWithDelay = delay(
                10,
                fromCallback(model.onDidChangeContent, () => model.getValue(), model)
              ) // delay is required because change emits an event before diagnostics and other stuff are finished
              const editorChanges = modelChangeWithDelay
              const changesWithInitial = merge(now(model.getValue()), editorChanges)
              const ignoreWhitespaceChanges = skipRepeatsWith(
                (prev, next) => prev.replace(whitespaceRegexp, '') === next.replace(whitespaceRegexp, ''),
                changesWithInitial
              )

              const tsModelChanges = switchMap(
                async (params): Promise<ModelChangeBehavior> => {
                  const getWorker = params.worketStream
                  const worker = await getWorker()
                  const semanticDiagnosticsQuery = worker.getSemanticDiagnostics(model.uri.toString())
                  const syntacticDiagnosticsQuery = worker.getSyntacticDiagnostics(model.uri.toString())
                  const semanticDiagnostics = await semanticDiagnosticsQuery
                  const syntacticDiagnostics = await syntacticDiagnosticsQuery

                  return {
                    node,
                    instance,
                    monacoGlobal,
                    worker,
                    model,
                    modelChange: params.ignoreWhitespaceChanges,
                    semanticDiagnostics,
                    syntacticDiagnostics
                  }
                },
                combine({
                  ignoreWhitespaceChanges,
                  worketStream
                })
              )

              return tsModelChanges
            })
          )
        )()

        return $editor
      }, editorload),
      { change }
    ]
  })
