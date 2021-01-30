# aelea - Tiny Composable UI Framework
Functional Reactive Programming UI library based on [@most/core](https://github.com/mostjs/core) paradigm and [architecture](https://github.com/cujojs/most/wiki/Architecture)

# Why?
- Everything is composable, elements, style, behaviors are reusable and compose well together. All Built to scale
- State UI naturally using Streams and set changes using Behaviors
- Highly performant since diffing became obsolete, state changes based on natural Behaviors
- CSS Declarations only exists when they are displayed, reducing paint time
- Components is similar to a function, AS I/O, Outputs(Automatically Typed) outout(unlike any other libraries)
- Typed. Less friction, more feedback Style, Elements and even Dom Events



### Simple Counter
```typescript
import { map, switchLatest, constant, periodic, scan } from '@most/core'
import { newDefaultScheduler } from '@most/scheduler'

import { text, renderTo } from '@aelea/core'
import { pipe } from '../common'

const add = (n1: number, n2: number) => n1 + n2

const oneEverySecond = constant(1 ,periodic(1000))
const accumulate = scan(add, 0, oneEverySecond)

const counter = switchLatest(map(pipe(String, text), accumulate))

branch(xForver(document.body))(
  counter
).run(nullSink, newDefaultScheduler())
```

### Simple counter component `$Counter.ts` - view | style | Behavior
This is a dumbed down version where everything is packed into a single file

For a better composed example check [./examples/src/components/$Counter]()

```typescript
import { constant, map, merge, scan } from '@most/core'
import { $custom, $element, $text, Behavior, component, style, event, INode, runBrowser } from '@aelea/core'


// reusable style
const displayFlex = style({ display: 'flex' })
const spacingStyle = style({ gap: '16px' })


// reusable elements
const $row = $custom('row')(displayFlex)
const $column = $custom('column')(displayFlex, style({ flex: 1, flexDirection: 'row' }))

const sumFromZeroOp = scan((current: number, x: number) => current + x, 0)


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

    { increment, decrement, count }

  ]
})


runBrowser({ rootNode: document.body })(
  $Counter({})
)

```
