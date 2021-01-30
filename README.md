# aelea - Tiny Composable UI Framework
Functional Reactive Programming UI library based on [@most/core](https://github.com/mostjs/core) paradigm and [architecture](https://github.com/cujojs/most/wiki/Architecture)

# Why?
- Everything is composable, elements, style, behaviors are reusable and compose well together. All Built to scale
- State UI naturally using Streams and changes declared using Behaviors
- Highly performant since diffing became obsolete, state changes based on natural Behaviors
- CSS Declarations only exists when they are displayed, reducing paint time
- Components is similar to a function, AS I/O, Outputs(Automatically Typed) outout(unlike any other libraries)
- Typed. Less friction, more feedback Style, Elements and even Dom Events



### Functionally Increment number periodically
```typescript
import { $node, $text, O, runBrowser } from '@aelea/core'
import { constant, map, periodic, scan } from '@most/core'

const add = (n1: number, n2: number) => n1 + n2

// O(AKA Pipe) compose operations for later consumption
const accumulate = O(
  periodic,     //  event of undefined
  constant(1),  //  map undefined to 1
  scan(add, 0), //  add up numbers starting with 0
  map(String)   //  map number into string
)

const oneEverySecond = accumulate(1000)

const $pinkishCountUp =
  $node(style({ padding: '10px', background: 'hotpink' }))(
    $text(oneEverySecond)
  )

runBrowser({ rootNode: document.body })($pinkishCountUp )
```

### Simple UI Counter - View, Style and Behavior
This is a dumbed down version where everything is packed into a single file

For a better composed example check [/examples/src/components/$Counter.ts](/examples/src/components/$Counter.ts)

```typescript
import { constant, map, merge, scan } from '@most/core'
import { $custom, $element, $text, Behavior, component, style, event, INode, runBrowser } from '@aelea/core'


// composable style
const displayFlex = style({ display: 'flex' })
const spacingStyle = style({ gap: '16px' })


// composable elements
const $row = $custom('row')(displayFlex)
const $column = $custom('column')(displayFlex, style({ flex: 1, flexDirection: 'row' }))

const sumFromZeroOp = scan((current: number, x: number) => current + x, 0)

// Component that outputs state(optionally), this is currently not used anywhere, see next example to see it being consumed
const $Counter = component((
  [sampleIncrement, increment]: Behavior<INode, 1>,
  [sampleDecrement, decrement]: Behavior<INode, -1>
) => {

  const incrementBehavior = sampleIncrement(
    event('click'),
    constant(1)
  )

  const decrementBehavior = sampleDecrement(
    event('click'),
    constant(-1)
  )

  const count = sumFromZeroOp(merge(increment, decrement))

  return [

    $row(spacingStyle)(
      $column(
        $element('button')(incrementBehavior)(
          $text('+')
        ),
        $element('button')(decrementBehavior)(
          $text('-')
        ),
      ),

      $text(style({ fontSize: '64px', }))(
        map(String, count)
      )
    ),

    { increment, decrement }

  ]
})


runBrowser({ rootNode: document.body })(
  $Counter({})
)

```

### Using $Counter Typed Output Behaviors
In previous example we didn't do much except creating a counter component and drawing it using `runBrowser` on `document.body`

this time, lets play with with the $Component output behaviors
```typescript
import { constant, map, merge, scan } from '@most/core'
import { $text, Behavior, component, style, INode, runBrowser } from '@aelea/core'
import $Counter, { $column, $row, spacingStyle } from './$Counter' // lets assume we default export $Counter and a few reusable $node's and style instead

const $SumOfTwoCounters = component((
  [sampleIncrements, increments]: Behavior<INode, 1>,
  [sampleDecrements, decrements]: Behavior<INode, -1>
) => {

  const sumOfTwoCounters = merge(increments, decrements)

  return [

    $column(spacingStyle)(

      $row(spacingStyle)(
        $Counter({
          increment: sampleIncrements(),
          decrement: sampleDecrements(),
        }),

        $Counter({
          increment: sampleIncrements(),
          decrement: sampleDecrements(),
        }),
      )

      $text(style({ border: 'solid 1px blue', }))(
        map(sum => `Total sum of two counters: ${sum}`, sumOfTwoCounters)
      )
    )

  ]
})

runBrowser({ rootNode: document.body })(
  $SumOfTwoCounters({})
)

```