# Aelea - Composable Reactive UI Framework

A functional reactive UI framework built on composable streams. Aelea combines reactive programming with DOM composition to create dynamic user interfaces without virtual DOM or state management layers.

## Key Features

- **Composable Streams**: Build complex behaviors by composing simple stream operators
- **Composable DOM**: Elements, styles, and attributes compose through function application
- **Direct Reactivity**: Stream events directly update DOM without intermediate layers
- **Type Safety**: Full TypeScript support with inference
- **Modular Design**: Tree-shakeable modules for minimal bundle size
- **Pluggable Architecture**: Compose custom schedulers, renderers, and stream operators

## Installation

```bash
npm install aelea
# or
bun add aelea
```

## Core Concepts

### 1. Streams Drive Everything

In Aelea, UI updates are driven by streams of data:

```typescript
import { $text, stream } from 'aelea/ui'
import { map, periodic, aggregate } from 'aelea/stream'

// Create a stream that emits incremented numbers every second
const counter = aggregate((count, _) => count + 1, 0, periodic(1000))

// Text node that updates with stream values
const $counter = $text(map(String, counter))
```

### 2. Elements are Functions

DOM elements are created through element factories:

```typescript
import { $element, $custom, style } from 'aelea/ui'

// Create standard HTML elements
const $div = $element('div')
const $button = $element('button')
const $input = $element('input')

// Create custom elements
const $card = $custom('app-card')

// Compose elements with styles
const $styledCard = $div(
  style({ padding: '20px', border: '1px solid #ccc' })
)(
  $element('span')()('Hello, World!')
)

// Create reusable element factories
const $h1 = $element('h1')
const $p = $element('p')
const $form = $element('form')
const $label = $element('label')
```

### 3. Components are I/O Functions

Components receive behavior streams and output both UI and new streams:

```typescript
import { type IStream, map, merge, sampleMap } from 'aelea/stream'
import type { IBehavior } from 'aelea/stream-extended'
import { $element, $text, component, type INode, nodeEvent, style } from 'aelea/ui'

export const $Counter = (value: IStream<number>) => component((
  [increment, incrementTether]: IBehavior<INode, MouseEvent>,
  [decrement, decrementTether]: IBehavior<INode, MouseEvent>
) => {
  const $button = $element('button')
  const $container = $element('div')(style({ display: 'flex', gap: '10px', alignItems: 'center' }))

  return [
    $container(
      $button(incrementTether(nodeEvent('click')))(
        $text('+')
      ),

      $text(map(String, value)),

      $button(decrementTether(nodeEvent('click')))(
        $text('-')
      )
    ),

    // Output stream
    {
      valueChange: merge(
        sampleMap(v => v + 1, value, increment),
        sampleMap(v => v - 1, value, decrement)
      )
    }
  ]
})
```

### 4. Component Composition

Components can receive state as input and output state changes. This pattern allows for flexible state management:

```typescript
// Component that receives state and outputs changes
const $CounterList = ({ counterList }: { counterList: IStream<number[]> }) =>
  component((
    [addCounter, addCounterTether]: IBehavior<INode, MouseEvent>,
    [updateCounter, updateCounterTether]: IBehavior<number, { index: number; value: number }>
  ) => {
    const $button = $element('button')
    const $div = $element('div')
    
    return [
      $div()(
        // Display derived state
        $text('Total: '),
        $text(map(list => String(list.reduce((a, b) => a + b, 0)), counterList)),
        $text(' | '),
        $button(addCounterTether(nodeEvent('click')))($text('Add Counter')),
        
        // Render each counter
        switchMap(list => 
          $div()(
            ...list.map((value, index) => 
              $Counter(constant(value))({
                valueChange: updateCounterTether(
                  map(newValue => ({ index, value: newValue }))
                )
              })
            )
          )
        , counterList)
      ),
      
      // Output: state changes
      {
        changeCounterList: merge(
          // Add counter
          sampleMap(list => [...list, 0], counterList, addCounter),
          // Update counter
          sampleMap((list, { index, value }) => {
            const newList = [...list]
            newList[index] = value
            return newList
          }, counterList, updateCounter)
        )
      }
    ]
  })

// Parent manages state
const $App = component((
  [listChange, listChangeTether]: IBehavior<number[]>
) => {
  // Parent owns the state
  const counterList = state(listChange, [0, 0])
  
  return [
    $CounterList({ counterList })({
      changeCounterList: listChangeTether()
    })
  ]
})
```

**Key Composition Concepts:**

1. **State as Input**: Components receive state as streams, not manage it internally. This allows parent components to control where and how state is stored.

2. **Changes as Output**: Components output state changes through behaviors. The component describes what should change, not how to change it.

3. **Parent Owns State**: The parent component creates the actual state using `state()` and wires the child's change outputs back to update it.

4. **Flexible Architecture**: This pattern allows state to be managed at any level - locally in a parent, globally in a store, or even remotely on a server.

**Note**: There are many ways to manage state flows in Aelea. This example shows a simple and generic pattern where components receive state and output changes, making them reusable and testable.

## Getting Started

### Hello World

```typescript
import { runBrowser, $text } from 'aelea/ui'
import { now } from 'aelea/stream'

runBrowser({ 
  rootNode: document.body 
})(
  $text(now('Hello, Aelea!'))
)
```


### Animated Transitions

```typescript
import { motion, component, styleBehavior, $element } from 'aelea/ui'
import { map, startWith } from 'aelea/stream'
import { behavior } from 'aelea/stream-extended'

const $AnimatedBox = component(() => {
  const [position, positionTether] = behavior<number>()
  
  // Smooth spring animation between position changes
  const animatedPosition = motion({ 
    stiffness: 170, 
    damping: 26 
  }, startWith(0, position))
  
  return [
    $element('div')(
      styleBehavior(
        map(x => ({ 
          transform: `translateX(${x}px)`
        }), animatedPosition)
      )
    )('Smooth!')
  ]
})
```

## UI Components Library

Aelea provides a separate `ui-components` module with pre-built components and utilities:

```typescript
import { $row, $column, $card } from 'aelea/ui-components'
import { $Button, $TextField, $Checkbox } from 'aelea/ui-components'
import { layoutSheet, designSheet } from 'aelea/ui-components'

// Layout helpers
const $header = $row(
  layoutSheet.spaceBetween,
  style({ padding: '20px' })
)

// Form components
const $loginForm = $column()(
  $TextField({ 
    label: 'Username',
    value: username$,
    validation: /* validation stream */
  }),
  $Button({
    $content: $text('Login'),
    click: loginClick$
  })
)
```

## Advanced Features

### Custom Schedulers

Schedulers are composable components that control task execution timing. The default implementation uses `queueMicrotask`. Custom schedulers can be composed with streams:

```typescript
import type { IScheduler } from 'aelea/stream'

// Example: Synchronous scheduler for testing
class SyncScheduler implements IScheduler {
  asap<T>(sink, task, ...args) {
    task(sink, ...args)
    return { [Symbol.dispose]: () => {} }
  }
  
  delay<T>(sink, task, delay, ...args) {
    const id = setTimeout(() => task(sink, ...args), delay)
    return { [Symbol.dispose]: () => clearTimeout(id) }
  }
  
  time() {
    return performance.now()
  }
}

// Use custom scheduler
const scheduler = new SyncScheduler()
stream.run(sink, scheduler)
```

Scheduler implementations can provide:

- Synchronous execution for testing
- Task execution logging
- Batching for high-throughput scenarios
- Priority queue scheduling
- Rate-limited execution

The IScheduler interface enables composition of different execution strategies with any stream.

### Routing

```typescript
import { create, match } from 'aelea/router'
import { now } from 'aelea/stream'

const router = create({
  fragmentsChange: /* url change stream */,
  fragment: ''
})

const home = router.create({ fragment: 'home' })
const about = router.create({ fragment: 'about' })

const $App = $element('div')()(
  match(home)(now($HomePage())),
  match(about)(now($AboutPage()))
)
```

### Custom Schedulers

Aelea uses a DOM-optimized scheduler that batches updates efficiently:

```typescript
import { createDomScheduler } from 'aelea/ui'

const scheduler = createDomScheduler()
// Microtasks for computations
scheduler.asap(sink, task, ...args)
// Animation frame for renders  
scheduler.paint(sink, task, ...args)
```

## Design Principles

1. **Composition**: Complex systems built from simple, composable parts
2. **Unidirectional Flow**: Data flows from streams to UI
3. **Explicit Effects**: Side effects are contained in streams
4. **Transparency**: All updates are traceable through the stream graph

## Examples

Check out the examples directory for more complex applications:

- Todo MVC implementation
- Real-time data dashboards
- Drag-and-drop interfaces
- Form validation
- Animation showcases

## License

MIT