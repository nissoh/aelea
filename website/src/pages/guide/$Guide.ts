import { $node, $p, $text, attr, component, style } from 'aelea/core'
import { $column, spacing } from 'aelea/ui-components'
import { $Example } from '../../components/$Example'
import $TSPeep from '../../components/typescript-notebook/$TSPeep'
import { $alert, $anchor } from '../../elements/$common'

export default () =>
  component(() => {
    return [
      $column(
        spacing.big,
        style({ flex: 1, alignItems: 'center' })
      )(
        $Example({ file: 'src/components/$QuantumList.ts' })(
          $alert(
            $text(
              'WIP: still in progress, external imports name have been encoded because of Monaco editor issue: https://github.com/microsoft/monaco-editor/issues/1306 '
            )
          ),

          $node(
            $text('aelea uses a reactive toolkit called '),
            $anchor(
              attr({
                href: 'https://mostcore.readthedocs.io/en/latest/index.html'
              })
            )($text('@most/core')),
            $text(
              ' Some basic understanding of functional programming and typescript is required, if you use Visual Studio Code IDE these code blocks will look familiar'
            )
          ),

          $p(
            $text(
              'The ultimate way to learn is to get your hands a little dirty, any changes in the code below will reflect it visually right below the code block'
            )
          ),

          $TSPeep({
            readOnly: false,
            code: `import { $text } from '@aelea/core'

export default $text('Yellow World')`
          })({}),

          $p(
            $text(
              `Nothing fancy yet, the "default export" renders a message and there is this "$text" function, "$" prefix is just a semantic for anything that will eventually emits DOM elements, it makes the code more readable to distinguish between different stream types, we'll see its usefulness later on`
            )
          ),

          $TSPeep({
            readOnly: false,
            code: `import { $text, $node, style } from '@aelea/core'

const colorStyle = style({ color: 'yellow' })
const containerStyle = style({ padding: '10px', display: 'block', border: '1px dashed yellow', borderRadius: '50px' })

const $container = $node(containerStyle, colorStyle)

export default $container(style({alignSelf: 'center'}))(
    $container(
        $text('Yellow World')
    )
)`
          })({}),

          $p($text('in this guide we will be creating different types of Counters in different levels of complexity')),

          $TSPeep({
            readOnly: false,
            code: `import { $text, $node } from '@aelea/core'
import { constant, map, periodic, scan } from '@most/core'

const eventEverySecond = periodic(1000)       // stream of undefined every 1000 milliseconds
const mapTo1 = constant(1, eventEverySecond)  // map that undefined into 1

const accumulate = scan((acc, one) => acc + one, 0, mapTo1)
const toString = map(String, accumulate)


export default $node(
  $text(toString)
)`
          })({}),

          $TSPeep({
            readOnly: false,
            code: `import { constant, map, merge, scan } from '@most/core'
import { $custom, $element, $text, component, style, INode, nodeEvent } from '@aelea/core'
import { IBehavior } from '@aelea/core'

// composable style
const displayFlex = style({ display: 'flex' })
const spacingStyle = style({ gap: '16px' })

// composable elements
const $row = $custom('row')(displayFlex)
const $column = $custom('column')(displayFlex, style({ flexDirection: 'column' }))

// Component that outputs state(optionally), this is currently not used anywhere, see next example to see it being consumed
export default component((
    [increment, incrementTether]: IBehavior<INode, 1>,
    [decrement, decrementTether]: IBehavior<INode, -1>
  ) => {

    return [ // Component has to return [$Node, IBehavior(optionally)] in the next example we will use these outputted behaviors

      $row(spacingStyle)(
        $column(
          $element('button')(incrementTether(nodeEvent('click'), constant(1)))(
            $text('+')
          ),
          $element('button')(decrementTether(nodeEvent('click'), constant(-1)))(
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
        )({})
      )
    ]
  })
