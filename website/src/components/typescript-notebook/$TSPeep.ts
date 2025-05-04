import { awaitPromises, debounce, empty, filter, map, never, now, startWith, switchLatest } from '@most/core'
import {
  $custom,
  $node,
  $text,
  component,
  type I$Node,
  type IBehavior,
  motion,
  O,
  style,
  styleInline
} from 'aelea/core'
import { $column, $row } from 'aelea/ui-components'
import { pallete, theme } from 'aelea/ui-components-theme'
import { $MonacoEditor, type ModelChangeBehavior } from '../$MonacoEditor'

interface IMonaco {
  code: string
  readOnly?: boolean
}

export default ({ code = '', readOnly = true }: IMonaco) =>
  component(([change, changeTether]: IBehavior<ModelChangeBehavior, ModelChangeBehavior>) => {
    const $loader = $row(style({ width: '2px', backgroundColor: 'rgb(43 52 55)' }))(
      $row(
        styleInline(
          map(({ semanticDiagnostics, syntacticDiagnostics }) => {
            return {
              backgroundColor:
                semanticDiagnostics.length || syntacticDiagnostics.length ? pallete.negative : pallete.foreground
            }
          }, change)
        ),
        styleInline(
          map(
            (s) => ({ height: `${s}%` }),
            switchLatest(
              map((_) => {
                return motion({ stiffness: 160, damping: 36, precision: 0.1 }, 0, now(100))
              }, change)
            )
          )
        ),
        style({ flex: 1, backgroundColor: pallete.foreground })
      )()
    )

    const initalCodeBlockHeight = 24 + 20 + code.split('\n').length * 18

    return [
      $column(style({ flex: 1 }))(
        $MonacoEditor({
          code,
          config: {
            readOnly,
            automaticLayout: true,
            theme: theme.name === 'light' ? 'vs-light' : 'vs-dark'
          },
          containerStyle: { height: `${initalCodeBlockHeight}px` }
        })({
          change: changeTether()
        }),
        $row(style({ backgroundColor: pallete.background, minHeight: '30px' }))(
          $loader,

          $custom('render-here')(style({ padding: '10px 15px' }))(
            switchLatest(
              O(
                debounce(500),
                map(
                  async ({
                    model,
                    worker,
                    semanticDiagnostics,
                    syntacticDiagnostics
                  }: ModelChangeBehavior): Promise<I$Node> => {
                    if (semanticDiagnostics.length || syntacticDiagnostics.length) {
                      return never()
                    }

                    const emittedFiles = await worker.getEmitOutput(model.uri.toString())
                    const file = emittedFiles.outputFiles[0].text
                    const refImports = file.replace(/(} from '%40)/g, `} from 'https://esm.run/@`)

                    const esModuleBlobUrl = URL.createObjectURL(new Blob([refImports], { type: 'text/javascript' }))
                    const esModule = await import(/* @vite-ignore */ esModuleBlobUrl)

                    const value: I$Node = esModule.default ?? empty()

                    return value
                  }
                ),
                awaitPromises,
                filter((node) => node !== never()),
                startWith(
                  $node(style({ color: pallete.foreground, fontSize: '75%' }))($text('Loading Typescript Service...'))
                )
              )(change)
            )
          )
        )
      ),

      { change }
    ]
  })
