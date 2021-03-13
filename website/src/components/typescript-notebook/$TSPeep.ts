import { awaitPromises, empty, map, never, switchLatest, filter, now, debounce, startWith } from '@most/core'
import { $custom, $Node, $text, Behavior, component, motion, O, style, styleInline } from '@aelea/core'

import { $MonacoEditor, ModelChangeBehavior } from './$MonacoEditor'
import { $column, $row, layoutSheet } from '@aelea/ui-components'
import { theme } from '@aelea/ui-components-theme'



interface IMonaco {
  code: string
  readOnly?: boolean
}


export default ({ code = '', readOnly = true }: IMonaco) => component((
  [sampleChange, change]: Behavior<ModelChangeBehavior, ModelChangeBehavior>
) => {

  const $loader = $row(style({ width: '2px', backgroundColor: theme.baseDark }))(
    $row(
      styleInline(
        map(({ semanticDiagnostics, syntacticDiagnostics }) => {
          return {backgroundColor: semanticDiagnostics.length || syntacticDiagnostics.length ? theme.negative : theme.system}
        }, change)
      ),
      styleInline(
        map(
          s => ({ height: s + '%' }),
          switchLatest(
            map(xxx => {
              return motion({stiffness: 160, damping: 36, precision: .1}, 0, now(100))
            }, change)
          )
        )
      ),
      layoutSheet.flex,
      style({ backgroundColor: theme.system })
    )()
  )

 

  return [
    $column(layoutSheet.flex)(
      $MonacoEditor({ code, config: { readOnly } })({
        change: sampleChange()
      }),
      $row(style({ backgroundColor: `rgb(255 255 255 / 3%)`, minHeight: '30px' }))(
        $loader,

        $custom('render-here')(style({padding: '10px 15px'}))(
          switchLatest(
            O(
              debounce(500),
              map(async ({ model, worker, semanticDiagnostics, syntacticDiagnostics }: ModelChangeBehavior): Promise<$Node> => {

                if (semanticDiagnostics.length || syntacticDiagnostics.length) {
                  return never()
                }

                const emittedFiles = await worker.getEmitOutput(model.uri.toString())
                const file = emittedFiles.outputFiles[0].text
                const refImports = file.replace(/(} from '%40)/g, `} from 'https://esm.run/@`)

                const esModuleBlobUrl = URL.createObjectURL(new Blob([refImports], { type: 'text/javascript' }))
                const esModule = await import(/* webpackIgnore: true */esModuleBlobUrl)

                const value: $Node = esModule.default ?? empty()

                return value
              }),
              awaitPromises,
              filter(node => node !== never()),
              startWith($text(style({ color: theme.system, fontSize: '75%' }))('Loading Typescript Service...'))
            )(change)
          )
        )
      )
    ),

    { change }
  ]
})



