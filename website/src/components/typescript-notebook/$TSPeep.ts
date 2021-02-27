import { awaitPromises, chain, constant, empty, fromPromise, join, loop, map, never, scan, skip, switchLatest, recoverWith, filter, take, merge } from '@most/core'
import { $element, $Node, Behavior, component, fromCallback, IBranch, IBranchElement, INodeElement, O, style } from '@aelea/core'
import type { editor } from 'monaco-editor'
import type * as monaco from 'monaco-editor'
import { $column, $row } from '../../common/common'
import { column, flex, theme } from '../../common/stylesheet'
import { Stream } from '@most/types'
import { disposeWith } from '@most/disposable'
import { fetchFromMeta } from './fetchPackageDts'
import pastelTheme from './pastelTheme'
import monacoEsm from './monacoEsm'

const esMagic = (content: string) => {
  const esModuleBlobUrl = URL.createObjectURL(new Blob([content], { type: 'text/javascript' }))

  return import(/* webpackIgnore: true */esModuleBlobUrl)
}



function intersectionObserverEvent<T extends HTMLElement>(el: T): Stream<IntersectionObserverEntry> {
  return {
    run(sink, scheduler) {

      const intersectionObserver = new IntersectionObserver(entries => {
        sink.event(scheduler.currentTime(), entries[0])
      });

      intersectionObserver.observe(el)

      return disposeWith(([instance, el]) => instance.unobserve(el), [intersectionObserver, el] as const)
    }
  }
}

function resizeObserver<T extends INodeElement>(el: T): Stream<ResizeObserverEntry[]> {
  return {
    run(sink, scheduler) {

      // @ts-ignore
      const ro = new ResizeObserver((entries: ResizeObserverEntry[]) => {
        sink.event(scheduler.currentTime(), entries)
      })

      ro.observe(el)

      return disposeWith(([instance, el]) => instance.unobserve(el), [ro, el] as const)

    }
  }
}


const elementBecameVisibleEvent = O(
  intersectionObserverEvent,
  filter(cond => cond.intersectionRatio > 0),
  take(1)
)

async function loadMonaco(
  monacoGlobal: typeof monaco,
  container: HTMLElement,
  config?: editor.IStandaloneEditorConstructionOptions,
  override?: editor.IEditorOverrideServices
) {
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
    ...pastelTheme,
    base: "vs-dark"
  }

  monacoGlobal.editor.defineTheme('pastel', theme)

  const ops: editor.IStandaloneEditorConstructionOptions = {
    theme: 'pastel',
    "semanticHighlighting.enabled": true,
    minimap: {
      enabled: false
    },
    highlightActiveIndentGuide: false,
    glyphMargin: false,
    lineDecorationsWidth: 0,
    padding: {
      top: 16,
      bottom: 16
    },
    renderLineHighlight: 'none',
    renderIndentGuides: false,
    lineNumbers: 'off',
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


  return instance

}

interface Monaco {
  code: string
  readOnly?: boolean
}

interface MonacoInputBehavior {
  node: IBranch<HTMLElement>
  monacoInstance: editor.IStandaloneCodeEditor
  monacoGlobal: typeof monaco
  // output: monaco.languages.typescript.EmitOutput
}

export default ({ code = '', readOnly = true }: Monaco) => component((
  [sampleChange, change]: Behavior<MonacoInputBehavior, MonacoInputBehavior>
) => {


  const monacoOps = O(
    map(async (node: IBranch<HTMLElement>) => {

      const monacoGlobal = await monacoEsm
      const monacoInstance = await loadMonaco(
        monacoGlobal,
        node.element,
        {
          value: code,
          language: 'typescript',
          readOnly,
        }
      )


      fetchFromMeta(monacoGlobal.languages.typescript.typescriptDefaults, 'csstype', '3.0.6')

      fetchFromMeta(monacoGlobal.languages.typescript.typescriptDefaults, '@most/prelude', '1.8.0')
      fetchFromMeta(monacoGlobal.languages.typescript.typescriptDefaults, '@most/scheduler', '1.3.0')
      fetchFromMeta(monacoGlobal.languages.typescript.typescriptDefaults, '@most/disposable', '1.3.0')
      fetchFromMeta(monacoGlobal.languages.typescript.typescriptDefaults, '@most/types', '1.1.0')
      fetchFromMeta(monacoGlobal.languages.typescript.typescriptDefaults, '@most/core', '1.6.1')

      fetchFromMeta(monacoGlobal.languages.typescript.typescriptDefaults, '@aelea/core', '0.3.0')

      return { node, monacoInstance, monacoGlobal }
    }),
    awaitPromises,
    sampleChange(
      chain(mi => {
        const model = mi.monacoInstance.getModel()!
        const initalRender = elementBecameVisibleEvent(mi.node.element)
        const editorChanges = fromCallback(model.onDidChangeContent, model)

        return constant(mi, merge(initalRender, editorChanges))
      })
    ),
    map(monaco => monaco.node)
  )

  return [
    $column(
      $element('div')(flex, column, monacoOps, style({ position: 'relative' }))(),
      $row(style({ backgroundColor: theme.baseDark, minHeight: '30px', padding: '10px' }))(
        switchLatest(
          O(
            scan(async (seedPromise: Promise<any> | null, initMonaco: MonacoInputBehavior) => {

              const model = initMonaco.monacoInstance.getModel()!
              const modelValue = model.getValue()
              const modelValueTrimmed = modelValue.replace(/[\n\r\s\t]+/g, '')

              const seed = await seedPromise

              if (seed?.previousModelValue === modelValueTrimmed) {
                return { previousModelValue: modelValueTrimmed, value: never() }
              }

              const worker = await initMonaco.monacoGlobal.languages.typescript.getTypeScriptWorker()
              const filename = model.uri.toString()
              const service = await worker(model.uri)

              const emittedFiles = await service.getEmitOutput(filename)
              const diagnostics = await service.getSemanticDiagnostics(filename)

              if (diagnostics.length) {
                throw new Error('erros occured')
              }

              const file = emittedFiles.outputFiles[0].text
              const refImports = file.replace(/(} from ')/g, `} from 'https://esm.run/`)

              const value: $Node = (await esMagic(refImports)).default ?? empty()


              return { previousModelValue: modelValueTrimmed, value }
            }, null),
            skip(1),
            recoverWith((err) => {
              console.error(err)
              return never()
            }),
            awaitPromises,
            map(state => {
              return state.value
            }),
            filter(node => node !== never())
          )(change)
        )
      )
    ),

    { change }
  ]
})



