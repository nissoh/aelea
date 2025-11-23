import { $node, $p, $text, attr, component, style } from 'aelea/ui'
import { $column, spacing } from 'aelea/ui-components'
import { $Example } from '../../components/$Example'
import $TSPeep from '../../components/typescript-notebook/$TSPeep'
import { $anchor } from '../../elements/$common'

export default () =>
  component(() => {
    return [
      $column(
        spacing.big,
        style({ flex: 1, alignItems: 'center' })
      )(
        $Example({ file: 'src/components/$Guide.ts' })(
          $node(
            $text('Aelea uses composable streams for UI. Basics: '),
            $anchor(
              attr({
                href: 'https://mostcore.readthedocs.io/en/latest/index.html'
              })
            )($text('@most/core')),
            $text(' knowledge helps, but you can learn by editing the snippets below.')
          ),

          $p($text('1) Render text with a factory:')),
          $TSPeep({
            readOnly: false,
            code: `import { $text } from 'aelea/ui'

export default $text('Hello Aelea')`
          })({}),

          $p($text('2) Compose elements and styles:')),
          $TSPeep({
            readOnly: false,
            code: `import { $element, $text, style } from 'aelea/ui'

const $box = $element('div')

export default $box(
  style({ padding: '16px', borderRadius: '12px', border: '1px solid #4c8bf5' })
)(
  $text('Styled container')
)`
          })({}),

          $p($text('3) Minimal counter component with behaviors:')),
          $TSPeep({
            readOnly: false,
            code: `import { map, constant, reduce, merge } from 'aelea/stream'
import { $element, $text, component, nodeEvent } from 'aelea/ui'
import type { IBehavior } from 'aelea/stream-extended'

const $button = $element('button')

export default component((
  [inc, incTether]: IBehavior<HTMLElement, PointerEvent>,
  [dec, decTether]: IBehavior<HTMLElement, PointerEvent>
) => {
  const delta = merge(constant(1, inc), constant(-1, dec))
  const count = reduce((seed, n) => seed + n, 0, delta)

  return [
    $element('div')(
      $button(incTether(nodeEvent('click')))($text('+')),
      $text(map(String, count)),
      $button(decTether(nodeEvent('click')))($text('-'))
    )
  ]
})({})`
          })({})
        )({})
      )
    ]
  })
