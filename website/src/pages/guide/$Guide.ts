import { $text, Behavior, component, style } from '@aelea/core'
import { Route } from '@aelea/router'
import { $column, layoutSheet } from '@aelea/ui-components'
import $Example from '../../components/$Example'

import $TSPeep from '../../components/typescript-notebook/$TSPeep'




interface Guide {
  router: Route
}

export default ({ router }: Guide) => component((
  // []: Behavior<NodeChild, any>,
  [sampleLinkClick, routeChanges]: Behavior<string, string>
) => {

  return [

    $column(layoutSheet.spacingBig, layoutSheet.flex, style({ alignItems: 'center' }))(
      $text(`--WIP--`),

      $Example({ file: 'src/components/$QuantumList.ts' })(
        $text(`aelea uses a reactive toolkit called @most/core, in this guide we will be creating different types of Counters in different levels of complexity`),
        $text(`The ultimate way to learn is to get your hands a little dirty`),

        $TSPeep({
          readOnly: false,
          code:
            `import { $text, $node } from '@aelea/core'
import { constant, map, periodic, scan } from '@most/core'

const eventEverySecond = periodic(1000)
const mapTo1 = constant(1, eventEverySecond)

const accumulate = scan((n1: number, n2: number) => n1 + n2, 0, mapTo1)
const toString = map(String, accumulate)


export default $node(
  $text(toString)
)`
        })({}),

        $text(`WIP - still need to find a proper way to import typings`),

        $TSPeep({
          readOnly: false,
          code:
            `import { constant, map, merge, scan } from '@most/core'
import { $custom, $element, $text, Behavior, component, style, event, INode, runBrowser } from '@aelea/core'

// composable style
const displayFlex = style({ display: 'flex' })
const spacingStyle = style({ gap: '16px' })

// composable elements
const $row = $custom('row')(displayFlex)
const $column = $custom('column')(displayFlex, style({ flexDirection: 'column' }))

// Component that outputs state(optionally), this is currently not used anywhere, see next example to see it being consumed
export default component((
    [sampleIncrement, increment]: Behavior<INode, 1>,
    [sampleDecrement, decrement]: Behavior<INode, -1>
  ) => {

    return [ // Component has to return [$Node, Behavior(optionally)] in the next example we will use these outputted behaviors

      $row(spacingStyle)(
        $column(
          $element('button')(sampleIncrement(event('click'), constant(1)))(
            $text('+')
          ),
          $element('button')(sampleDecrement(event('click'), constant(-1)))(
            $text('-')
          )
        ),
        $text(style({ fontSize: '64px' }))(
          map(String, scan((current: number, x: number) => current + x, 0, merge(increment, decrement)))
        )
      ),

      { increment, decrement }
    ]
  }
)({})`
        })({})

      )({}),


    )

  ]
})

