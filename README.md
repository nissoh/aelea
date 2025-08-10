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
import { component, eventElementTarget, $text, $element } from 'aelea/ui'
import { map, merge, aggregate, constant, type IBehavior } from 'aelea/stream'
import { behavior } from 'aelea/stream-extended'

// Create reusable element factories
const $div = $element('div')
const $button = $element('button')

const $Counter = component((
  [increment, incrementTether]: IBehavior<MouseEvent, 1>,
  [decrement, decrementTether]: IBehavior<MouseEvent, -1>
) => {
  // Wire up click events to behaviors
  const inc = incrementTether(
    eventElementTarget('click'), 
    constant(1)
  )
  const dec = decrementTether(
    eventElementTarget('click'), 
    constant(-1)
  )
  
  // Combine streams to create counter state
  const count = aggregate((sum, n) => sum + n, 0, merge(increment, decrement))
  
  return [
    $div()(
      $button(inc)('+'),
      $text(map(String, count)),
      $button(dec)('-')
    ),
    { count } // Output the count stream for parent components
  ]
})
```

### 4. Component Composition

Components can be composed together, with parent components wiring child component behaviors:

```typescript
import { component, $element, $text, style } from 'aelea/ui'
import { map, merge, aggregate, now, constant, type IBehavior } from 'aelea/stream'
import { behavior } from 'aelea/stream-extended'

// Reusable Counter component (simplified from above)
const $Counter = ({ initial = 0 }) => component((
  [increment, incrementTether]: IBehavior<MouseEvent, number>,
  [decrement, decrementTether]: IBehavior<MouseEvent, number>
) => {
  const $button = $element('button')
  const inc = incrementTether(eventElementTarget('click'))
  const dec = decrementTether(eventElementTarget('click'))
  
  const value = aggregate((sum, n) => sum + n, initial, merge(increment, decrement))
  
  return [
    $element('div')(
      style({ display: 'flex', gap: '10px', alignItems: 'center' })
    )(
      $button(dec)('-'),
      $text(map(String, value)),
      $button(inc)('+')
    ),
    { value, increment, decrement }
  ]
})

// Parent component that manages multiple counters
const $CounterList = component((
  [addCounter, addCounterTether]: IBehavior<MouseEvent>
  [changeCounterList, changeCounterListTether]: IBehavior<number[]>
) => {
  const $button = $element('button')
  const $div = $element('div')
  
  // Track total across all counters
  const [totalChange, totalChangeTether] = behavior<number>()
  const total = aggregate((sum, n) => sum + n, 0, totalChange)
  
  // Create counters dynamically
  const addClick = addCounterTether(eventElementTarget('click'))

  const counterList = state([5], changeCounterList)
  
  return [
    $div()(
      $div(style({ marginBottom: '20px' }))(
        $text(map(n => `Total: ${n}`, total)),
        $button(addClick)('Add Counter')
      ),
      
      // Create initial counter
      $Counter({ initial: 5 })({
        increment: totalChangeTether(constant(1)),
        decrement: totalChangeTether(constant(-1))
      }),
      
      // More counters can be added dynamically using streams
    )
  ]
})
```

**Key Composition Concepts:**

1. **Behavior Tethering**: Parent components pass behavior tethers to children, allowing them to wire up event handlers while maintaining control over the data flow

2. **Output Contracts**: Child components return both UI elements and streams/values that parent components can use

3. **Stream Transformation**: Parents can transform child outputs before using them (e.g., converting increment/decrement clicks to total changes)

4. **Reusability**: Components are pure functions that can be instantiated multiple times with different configurations

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

### Interactive Counter

```typescript
import { runBrowser, component, style, eventElementTarget, $text, $element } from 'aelea/ui'
import { map, aggregate, startWith } from 'aelea/stream'
import { behavior } from 'aelea/stream-extended'

const $App = component(() => {
  const [clicks, clicksTether] = behavior<MouseEvent>()
  
  const count = startWith(
    0,
    aggregate((sum, _) => sum + 1, 0, clicks)
  )
  
  return [
    $element('div')(
      style({ 
        padding: '40px', 
        textAlign: 'center',
        fontFamily: 'system-ui'
      })
    )(
      $element('h1')()($text('Reactive Counter')),
      $element('button')(
        clicksTether(eventElementTarget('click')),
        style({ 
          padding: '10px 20px',
          fontSize: '18px',
          cursor: 'pointer'
        })
      )(
        $text(map(n => `Clicked ${n} times`, count))
      )
    )
  ]
})

runBrowser({ rootNode: document.body })($App())
```

### Fetching Data

```typescript
import { fromPromise, switchLatest, map } from 'aelea/stream'
import { $text, $element } from 'aelea/ui'

const fetchUsers = () => 
  fetch('https://jsonplaceholder.typicode.com/users')
    .then(res => res.json())

const users$ = fromPromise(fetchUsers())

const $UserList = switchLatest(
  map(users => 
    $element('div')()(
      $element('ul')()(
        ...users.map(user => 
          $element('li')()($text(user.name))
        )
      )
    )
  , users$)
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