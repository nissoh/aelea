# aelea - Tiny Composable UI Framework
Functional Reactive Programming UI library based on [@most/core](https://github.com/mostjs/core) paradigm and [architecture](https://github.com/cujojs/most/wiki/Architecture)

# Why?
- Everything is programatic. bulit by applying First Principle
- A lot is meant to compose well together. elements, style, behaviors are reusable and stateless. All Built to scale
- State UI naturally by declaring Behaviors, state managers are obsolete
- Highly performant since diffing became obsolete, state changes based on natural Behaviors
- CSS Declarations only exists when they are displayed, reducing paint time
- Components are similar to a function, AS I/O, Outputs(Automatically Typed) outout(unlike any other libraries)
- Typed. Less friction and more feedback. Style(csstype), Elements(either custom or specific(form, button etc)) and even Dom Events(based on element type)
- Animations. done using Spring physics https://www.youtube.com/watch?v=1tavDv5hXpo


### Increment number periodically
```typescript
import { $node, $text, O, runBrowser } from '@aelea/dom'
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

Sanboxed version [https://codesandbox.io/s/ancient-hooks-909qq?file=/src/index.ts](https://codesandbox.io/s/ancient-hooks-909qq?file=/src/index.ts)

```typescript
import { constant, map, merge, scan } from '@most/core'
import { $custom, $element, $text, Behavior, component, style, event, INode, runBrowser } from '@aelea/dom'

// composable style
const displayFlex = style({ display: 'flex' })
const spacingStyle = style({ gap: '16px' })

// composable elements
const $row = $custom('row')(displayFlex)
const $column = $custom('column')(displayFlex, style({ flexDirection: 'column' }))

const sumFromZeroOp = scan((current: number, x: number) => current + x, 0)

// Component that outputs state(optionally), this is currently not used anywhere, see next example to see it being consumed
const $Counter = component((
    [increment, incrementTether]: Behavior<INode, 1>,
    [decrement, decrementTether]: Behavior<INode, -1>
  ) => {
    const incrementBehavior = incrementTether(event('click'), constant(1))
    const decrementBehavior = decrementTether(event('click'), constant(-1))

    const count = sumFromZeroOp(merge(increment, decrement))

    return [ // Component has to return [$Node, Behavior(optionally)] in the next example we will use these outputted behaviors

      $row(spacingStyle)(
        $column(
          $element('button')(incrementBehavior)(
            $text('+')
          ),
          $element('button')(decrementBehavior)(
            $text('-')
          )
        ),

        $text(style({ fontSize: '64px' }))(
          map(String, count)
        )
      ),

      { increment, decrement }
    ]
  }
)

runBrowser({ rootNode: document.body })($Counter({}))


```

### Using $Counter Typed Output Behaviors
In previous example we didn't do much except creating a counter component and drawing it using `runBrowser` on `document.body`

this time, lets play with with the $Component output behaviors
```typescript
import { constant, map, merge, scan } from '@most/core'
import { $text, Behavior, component, style, INode, runBrowser } from '@aelea/dom'
import $Counter, { $column, $row, spacingStyle } from './$Counter' // lets assume we default export $Counter and a few reusable $node's and style instead

const $SumOfTwoCounters = component((
  [increments, incrementsTether]: Behavior<INode, 1>,
  [decrements, decrementsTether]: Behavior<INode, -1>
) => {

  const sumOfTwoCounters = scan((sum, count) =>  sum + count, 0 , merge(increments, decrements))

  return [

    $column(spacingStyle)(

      $row(spacingStyle)(
        $Counter({
          increment: incrementsTether(),
          decrement: decrementsTether(),
        }),

        $Counter({
          increment: incrementsTether(),
          decrement: decrementsTether(),
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

This is all nice and dandy, grasping everything will require some practice
There are various examples and whole lot of different tools avaible at the examples folder

### to see it running

- install NodeJS, https://nodejs.org/en/
- `npm install -g yarn` cmd to install yarn package and project manager
- `cd ./examples`
- `yarn run showcase`


`cd ./examples` and `yarn run`
