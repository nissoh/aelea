# Aelea - Reactive UI Framework

A lightweight, functional reactive UI framework that embraces simplicity and composability. Built on reactive streams, Aelea provides a declarative way to build dynamic user interfaces without virtual DOM or complex state management.

## Why Aelea?

- **Pure Reactive Streams**: UI updates flow naturally from data streams - no diffing, no reconciliation
- **True Composability**: Components, styles, and behaviors compose like functions
- **Zero Magic**: No hidden state, no lifecycle hooks, no context - just functions and streams
- **Type-Safe**: Full TypeScript support with automatic type inference
- **Lightweight**: Minimal runtime with tree-shakeable modules
- **Performance**: Direct DOM updates triggered by stream events

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
import { $text, stream } from 'aelea/core'
import { map, periodic, scan } from 'aelea/stream'

// Create a stream that emits incremented numbers every second
const counter = scan((count, _) => count + 1, 0, periodic(1000))

// Text node that updates with stream values
const $counter = $text(map(String, counter))
```

### 2. Elements are Functions

DOM elements are created through element factories:

```typescript
import { $element, $custom, style } from 'aelea/core'

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
import { component, behavior, eventElementTarget, $text, $element } from 'aelea/core'
import { map, merge, scan, constant } from 'aelea/stream'
import type { IBehavior } from 'aelea/stream'

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
  const count = scan((sum, n) => sum + n, 0, merge(increment, decrement))
  
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

## Getting Started

### Hello World

```typescript
import { runBrowser, $text } from 'aelea/core'
import { now } from 'aelea/stream'

runBrowser({ 
  rootNode: document.body 
})(
  $text(now('Hello, Aelea!'))
)
```

### Interactive Counter

```typescript
import { runBrowser, component, style, eventElementTarget, $text, $element } from 'aelea/core'
import { behavior, map, scan, startWith } from 'aelea/stream'

const $App = component(() => {
  const [clicks, clicksTether] = behavior<MouseEvent>()
  
  const count = startWith(
    0,
    scan((sum, _) => sum + 1, 0, clicks)
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
import { $text, $element } from 'aelea/core'

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
import { motion, component, styleBehavior, $element } from 'aelea/core'
import { behavior, map, startWith } from 'aelea/stream'

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
import { createDomScheduler } from 'aelea/core'

const scheduler = createDomScheduler()
// Microtasks for computations
scheduler.asap(sink, task, ...args)
// Animation frame for renders  
scheduler.paint(sink, task, ...args)
```

## Philosophy

Aelea embraces functional reactive programming principles:

1. **Data flows in one direction** - from streams to UI
2. **Side effects are explicit** - wrapped in streams
3. **Composition over configuration** - build complex UIs from simple parts
4. **No hidden magic** - you can trace every update

## Examples

Check out the examples directory for more complex applications:

- Todo MVC implementation
- Real-time data dashboards
- Drag-and-drop interfaces
- Form validation
- Animation showcases

## License

MIT