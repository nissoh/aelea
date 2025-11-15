# CLAUDE.md - AI Assistant Guide for Aelea

A guide for AI assistants working with Aelea, a functional reactive UI framework built on composable streams.

## Table of Contents

1. [Understanding Streams](#understanding-streams)
2. [Stream Composition](#stream-composition)
3. [Writing Aelea Components](#writing-aelea-components)
4. [Component Composition](#component-composition)
5. [Rendering to the Page](#rendering-to-the-page)
6. [Common Patterns](#common-patterns)
7. [Project Structure](#project-structure)
8. [Development Workflow](#development-workflow)

---

## Understanding Streams

### What is a Stream?

A **stream** is a lazy, composable source of values over time. Think of it as an observable sequence that emits events.

```typescript
import type { IStream } from 'aelea/stream'

// A stream is just this interface:
interface IStream<T> {
  run(sink: ISink<T>, scheduler: IScheduler): Disposable
}
```

**Key characteristics:**
- **Lazy**: Doesn't execute until `run()` is called
- **Composable**: Streams combine to create new streams
- **Pure**: Transformations don't mutate, they return new streams
- **Time-based**: Represents values changing over time

### Stream Diagram Notation

Understanding Aelea requires understanding stream diagrams:

```
stream: -a-b-c->
```
- Each `-` is one unit of time (no event)
- Letters are values emitted at that time
- `>` means the stream continues
- `|` means the stream completed

**Multiple streams:**
```
streamA: -1---3---5->
streamB: --a---b---c->
merge:   -1a--3b--5c->
```

Streams are vertically aligned by time - events in the same column happen simultaneously.

### Creating Streams (Sources)

**From immediate values:**
```typescript
import { now, empty } from 'aelea/stream'

// Emit a single value immediately
const greeting = now('Hello')
// Diagram: Hello|

// Emit nothing and complete
const nothing = empty()
// Diagram: |
```

**From time-based events:**
```typescript
import { periodic, at } from 'aelea/stream'

// Emit incrementing numbers every 1000ms
const tick = periodic(1000)
// Diagram: -0-1-2-3-4->

// Emit value at specific time
const delayed = at(5000, 'ready')
// Diagram: -----ready|
```

**From arrays/iterables:**
```typescript
import { fromIterable } from 'aelea/stream'

const numbers = fromIterable([1, 2, 3, 4, 5])
// Diagram: 12345|
```

**From promises:**
```typescript
import { fromPromise } from 'aelea/stream'

const userData = fromPromise(
  fetch('/api/user').then(r => r.json())
)
// Diagram: ------{user data}|
```

**From user interactions (in UI context):**
```typescript
import { nodeEvent } from 'aelea/ui'

// Create element and capture click events
const button = document.querySelector('button')
const clicks = nodeEvent('click')(button)
// Diagram: ----x--x-----x-> (each x is a click event)
```

### Running Streams

Streams are lazy - they don't do anything until you run them:

```typescript
import { now } from 'aelea/stream'
import { createDefaultScheduler } from 'aelea/stream'

const stream = now(42)

// Create a sink to receive values
const sink = {
  event(time, value) {
    console.log('Value:', value)
  },
  error(time, err) {
    console.error('Error:', err)
  },
  end(time) {
    console.log('Complete')
  }
}

// Run the stream
const scheduler = createDefaultScheduler()
const disposable = stream.run(sink, scheduler)

// Clean up when done
disposable[Symbol.dispose]()
```

**In practice**, you rarely run streams manually - the UI system handles this for you.

---

## Stream Composition

The power of streams comes from composing them together.

### Transforming Streams

**map - Transform each value:**
```typescript
import { map, periodic } from 'aelea/stream'

const numbers = periodic(1000)
// Diagram: -0-1-2-3-4->

const doubled = map(n => n * 2, numbers)
// Diagram: -0-2-4-6-8->
```

**filter - Keep only matching values:**
```typescript
import { filter } from 'aelea/stream'

const numbers = fromIterable([1, 2, 3, 4, 5, 6])
// Diagram: 123456|

const evens = filter(n => n % 2 === 0, numbers)
// Diagram: -2-4-6|
```

**aggregate - Reduce with accumulation (like scan):**
```typescript
import { aggregate, periodic } from 'aelea/stream'

const tick = periodic(1000)
// Diagram: -x-x-x-x->

const count = aggregate((acc, _) => acc + 1, 0, tick)
// Diagram: -1-2-3-4->
```

### Combining Multiple Streams

**merge - Combine events from multiple streams:**
```typescript
import { merge } from 'aelea/stream'

const streamA = /* -1---3---5-> */
const streamB = /* --2---4----> */

const merged = merge(streamA, streamB)
// Diagram: -12-34-5->
```

**combine - Combine latest values:**
```typescript
import { combine } from 'aelea/stream'

const name =  /* -Alice---Bob-> */
const age =   /* ---25------30-> */

const user = combine((name, age) => ({ name, age }), name, age)
// Diagram: ---{Alice,25}-{Bob,25}-{Bob,30}->
```

**sample - Sample one stream when another emits:**
```typescript
import { sample } from 'aelea/stream'

const position = /* -0-1-2-3-4-5-> */
const clicks =   /* ----x-----x---> */

const clickedPos = sample(position, clicks)
// Diagram: ----2-----5->
```

**sampleMap - Sample and transform:**
```typescript
import { sampleMap } from 'aelea/stream'

const value =     /* -5-------10-> */
const increment = /* ---x--x-----> */

const result = sampleMap(v => v + 1, value, increment)
// Diagram: ---6--6---->
// First: value is 5, +1 = 6
// Second: value is still 5, +1 = 6
```

### Higher-order Stream Operations

**switchLatest - Switch to the latest inner stream:**
```typescript
import { switchLatest, map, fromPromise } from 'aelea/stream'

const query = /* -"cat"---"dog"--> */

const searchResults = switchLatest(
  map(query =>
    fromPromise(fetch(`/api/search?q=${query}`).then(r => r.json()))
  , query)
)
// Cancels previous search when new query arrives
```

**switchMap - Convenience for map + switchLatest:**
```typescript
import { switchMap } from 'aelea/stream'

// Equivalent to the above
const searchResults = switchMap(
  query => fromPromise(fetch(`/api/search?q=${query}`).then(r => r.json())),
  query
)
```

### Timing Operations

**debounce - Emit only after silence:**
```typescript
import { debounce } from 'aelea/stream'

const typing = /* -a-b-c------d-e-f-----> */
const search = debounce(300, typing)
// Diagram: -------c---------f->
// Only emits when 300ms pass without new events
```

**throttle - Limit emission rate:**
```typescript
import { throttle } from 'aelea/stream'

const scroll = /* -x-x-x-x-x-x-x-x-x-> */
const limited = throttle(100, scroll)
// Diagram: -x---x---x---x---x->
// At most one event per 100ms
```

**delay - Delay all events:**
```typescript
import { delay } from 'aelea/stream'

const clicks = /* -x---x-----x-> */
const delayed = delay(1000, clicks)
// Diagram: --x---x-----x->
// Each event delayed by 1000ms
```

### Stream Utilities

**skip - Skip first N events:**
```typescript
import { skip } from 'aelea/stream'

const stream = fromIterable([1, 2, 3, 4, 5])
const skipped = skip(2, stream)
// Diagram: --345|
```

**take - Take first N events:**
```typescript
import { take } from 'aelea/stream'

const infinite = periodic(1000)
const limited = take(3, infinite)
// Diagram: -0-1-2|
```

**skipRepeats - Skip consecutive duplicates:**
```typescript
import { skipRepeats } from 'aelea/stream'

const values = fromIterable([1, 1, 2, 2, 2, 3, 1])
const unique = skipRepeats(values)
// Diagram: 1-2---3-1|
```

---

## Writing Aelea Components

### The Component Pattern

An Aelea component is a function that:
1. **Receives input state** as streams
2. **Declares behaviors** for user interactions
3. **Returns a tuple** of `[UI, outputs]`

```typescript
import { component } from 'aelea/ui'
import type { IBehavior } from 'aelea/stream-extended'
import type { IStream } from 'aelea/stream'

const $MyComponent = (inputState: IStream<State>) =>
  component((
    [userEvent, userEventTether]: IBehavior<Node, Event>
  ) => {
    // Component logic here

    return [
      // 1. UI (DOM nodes)
      $div(/* ... */),

      // 2. Output streams
      {
        stateChange: /* stream of state changes */
      }
    ]
  })
```

### Understanding Behaviors

A **behavior** is a bidirectional stream pair: `[stream, tether]`

```typescript
type IBehavior<TMsg, TReq = TMsg> = [
  IStream<TReq>,  // Output stream (data flowing out)
  Tether<TMsg>    // Input tether (data flowing in)
]
```

**In components:**
```typescript
component((
  [clicks, clickTether]: IBehavior<Node, PointerEvent>
) => {
  // clicks - stream of click events (output)
  // clickTether - function to wire up click sources (input)

  return [
    $button(
      clickTether(nodeEvent('click'))  // Wire DOM clicks to tether
    ),
    { clicks }  // Expose click stream as output
  ]
})
```

**The tether is a function:**
- Takes a stream as input
- Returns a function that can be applied to DOM nodes
- Connects external events to the component's internal stream

### Simple Component Example

```typescript
import { $text, $element, component, style, nodeEvent } from 'aelea/ui'
import { map, merge, sampleMap } from 'aelea/stream'
import type { IBehavior } from 'aelea/stream-extended'
import type { IStream } from 'aelea/stream'

// Counter component receives current value, outputs changes
export const $Counter = (value: IStream<number>) =>
  component((
    [increment, incrementTether]: IBehavior<Node, PointerEvent>,
    [decrement, decrementTether]: IBehavior<Node, PointerEvent>
  ) => {
    const $button = $element('button')
    const $div = $element('div')

    return [
      // UI - display value and buttons
      $div(
        style({ display: 'flex', gap: '10px' })
      )(
        $button(
          incrementTether(nodeEvent('click'))
        )(
          $text('+')
        ),

        $text(map(n => String(n), value)),

        $button(
          decrementTether(nodeEvent('click'))
        )(
          $text('-')
        )
      ),

      // Outputs - stream of value changes
      {
        valueChange: merge(
          sampleMap(v => v + 1, value, increment),
          sampleMap(v => v - 1, value, decrement)
        )
      }
    ]
  })
```

**How it works:**
1. Receives `value` stream as input
2. Declares two behaviors for increment/decrement clicks
3. Wires DOM click events to tethers
4. Displays current value using `$text(map(...))`
5. Outputs merged stream of value changes

### Element Creation

**Basic elements:**
```typescript
import { $element, $text } from 'aelea/ui'

const $div = $element('div')
const $button = $element('button')
const $input = $element('input')
const $span = $element('span')

// Text nodes
const $label = $text('Static text')
const $dynamic = $text(streamOfStrings)
```

**Curried composition pattern:**
```typescript
// Phase 1: Apply operations (returns function)
const $styledDiv = $div(
  style({ padding: '20px', color: 'blue' }),
  attr({ id: 'container' })
)

// Phase 2: Add children (returns node)
const $container = $styledDiv(
  $text('Hello'),
  $button()('Click me')
)
```

**All in one:**
```typescript
const $card = $div(
  style({
    padding: '20px',
    border: '1px solid #ccc',
    borderRadius: '8px'
  })
)(
  $element('h2')()('Title'),
  $element('p')()('Description text'),
  $button()('Action')
)
```

### Styling

**Static styles:**
```typescript
import { style } from 'aelea/ui'

$div(
  style({
    padding: '20px',
    backgroundColor: 'blue',
    color: 'white',

    // Pseudo-selectors
    ':hover': {
      backgroundColor: 'darkblue'
    },

    // Media queries
    '@media (max-width: 768px)': {
      padding: '10px'
    }
  })
)
```

**Reactive styles:**
```typescript
import { styleBehavior } from 'aelea/ui'

const $box = $div(
  styleBehavior(
    map(x => ({
      transform: `translateX(${x}px)`
    }), position)
  )
)
```

### Attributes

**Static attributes:**
```typescript
import { attr } from 'aelea/ui'

$input(
  attr({
    type: 'text',
    placeholder: 'Enter your name',
    disabled: false
  })
)
```

**Reactive attributes:**
```typescript
import { attrBehavior } from 'aelea/ui'

$input(
  attrBehavior(
    map(disabled => ({ disabled }), isDisabled)
  )
)
```

### Events

**Capturing events:**
```typescript
import { nodeEvent } from 'aelea/ui'

component((
  [clicks, clickTether]: IBehavior<Node, MouseEvent>,
  [input, inputTether]: IBehavior<Node, InputEvent>
) => {
  return [
    $div()(
      $button(
        clickTether(nodeEvent('click'))
      )('Click me'),

      $input(
        inputTether(nodeEvent('input'))
      )
    ),
    { clicks, input }
  ]
})
```

---

## Component Composition

### Parent-Child Pattern

Components compose by **receiving state** and **outputting changes**.

**Child component** (receives state, outputs changes):
```typescript
// $Counter receives value, outputs valueChange
const $Counter = (value: IStream<number>) =>
  component((
    [increment, incrementTether]: IBehavior<Node, PointerEvent>,
    [decrement, decrementTether]: IBehavior<Node, PointerEvent>
  ) => {
    return [
      $div()(/* UI */),
      {
        valueChange: merge(
          sampleMap(v => v + 1, value, increment),
          sampleMap(v => v - 1, value, decrement)
        )
      }
    ]
  })
```

**Parent component** (owns state, wires child):
```typescript
import { state } from 'aelea/stream-extended'

const $App = component((
  [valueChange, valueChangeTether]: IBehavior<number>
) => {
  // Parent creates and owns the state
  const count = state(valueChange, 0)  // Initial value: 0

  return [
    $div()(
      // Pass state to child, wire output back to parent
      $Counter(count)({
        valueChange: valueChangeTether()
      })
    ),
    {}  // No outputs (top-level component)
  ]
})
```

**How state() works:**
```typescript
import { state } from 'aelea/stream-extended'

// state(changes, initial) creates a stateful stream
const count = state(valueChange, 0)

// Diagram:
// valueChange: ----5---3---7->
// count:       0---5---3---7->
//              ^initial value, then follows changes
```

### Multi-Child Composition

**List of counters example:**
```typescript
import { state, behavior } from 'aelea/stream-extended'
import { map, merge, sampleMap, switchMap } from 'aelea/stream'

const $CounterList = component((
  [addCounter, addCounterTether]: IBehavior<Node, PointerEvent>,
  [updateCounter, updateCounterTether]: IBehavior<number, { index: number, value: number }>
) => {
  // State: array of counter values
  const counterList = state(
    merge(
      // Add new counter
      sampleMap(list => [...list, 0], counterList, addCounter),

      // Update counter at index
      sampleMap((list, { index, value }) => {
        const newList = [...list]
        newList[index] = value
        return newList
      }, counterList, updateCounter)
    ),
    [0, 0]  // Initial: 2 counters
  )

  return [
    $div()(
      $button(
        addCounterTether(nodeEvent('click'))
      )('Add Counter'),

      // Re-render list when it changes
      switchMap(list =>
        $div()(
          ...list.map((_, index) =>
            $Counter(
              map(list => list[index], counterList)
            )({
              valueChange: updateCounterTether(
                map(newValue => ({ index, value: newValue }))
              )
            })
          )
        )
      , counterList)
    ),
    {}
  ]
})
```

**Key pattern:**
- State is an array `number[]`
- Each child gets a derived stream: `map(list => list[index], counterList)`
- Child outputs include the index: `{ index, value }`
- Parent merges all updates to the list state

### Optimizing Re-renders

**Problem:** `switchMap` re-renders on every array change, even if length doesn't change.

**Solution:** Skip repeats based on length:
```typescript
import { skipRepeatsWith } from 'aelea/stream'

// Only re-render when length changes
const listByLength = skipRepeatsWith(
  (a, b) => a.length === b.length,
  counterList
)

switchMap(list =>
  $div()(/* render list */)
, listByLength)
```

**Individual item optimization:**
```typescript
// Skip repeats for individual counter values
const counterValue = (index: number) =>
  skipRepeats(
    map(list => list[index], counterList)
  )

// Use in rendering
$Counter(counterValue(index))
```

### Layout Composition

**Using layout helpers:**
```typescript
import { $row, $column } from 'aelea/ui-components'
import { spacing } from 'aelea/ui-components'

const $Header = component(() => {
  return [
    $row(
      spacing.default,  // Gap between items
      style({ alignItems: 'center', placeContent: 'space-between' })
    )(
      $text('Logo'),
      $button()('Menu')
    ),
    {}
  ]
})

const $Page = component(() => {
  return [
    $column(
      spacing.large  // Vertical spacing
    )(
      $Header()(),
      $text('Content'),
      $text('Footer')
    ),
    {}
  ]
})
```

**What $row and $column are:**
```typescript
// Simplified implementation
const $row = (...operations) =>
  $element('div')(
    style({ display: 'flex', flexDirection: 'row' }),
    ...operations
  )

const $column = (...operations) =>
  $element('div')(
    style({ display: 'flex', flexDirection: 'column' }),
    ...operations
  )
```

### Pre-built Components

**Using ui-components:**
```typescript
import { $Button, $TextField, $NumberTicker } from 'aelea/ui-components'

const $LoginForm = component((
  [submit, submitTether]: IBehavior<Node, PointerEvent>,
  [usernameInput, usernameInputTether]: IBehavior<Node, InputEvent>
) => {
  const username = state(
    map(e => e.target.value, usernameInput),
    ''
  )

  return [
    $column(spacing.default)(
      $TextField({
        label: 'Username',
        value: username
      })({
        userChange: usernameInputTether()
      }),

      $Button({
        $content: $text('Login')
      })({
        click: submitTether()
      })
    ),
    { submit, username }
  ]
})
```

---

## Rendering to the Page

### Basic Rendering

**Simple app:**
```typescript
import { render } from 'aelea/ui'

const $App = component(() => {
  return [
    $div()(
      $text('Hello, Aelea!')
    ),
    {}
  ]
})

// Render to the page
render({
  rootAttachment: document.body,
  $rootNode: $App()({})  // Call component with no inputs
})
```

**With inputs:**
```typescript
const $App = component((
  [click, clickTether]: IBehavior<Node, PointerEvent>
) => {
  const count = state(
    sampleMap(n => n + 1, count, click),
    0
  )

  return [
    $button(
      clickTether(nodeEvent('click'))
    )(
      $text(map(n => `Clicked ${n} times`, count))
    ),
    {}
  ]
})

render({
  rootAttachment: document.body,
  $rootNode: $App()({})
})
```

### Understanding render()

```typescript
render({
  rootAttachment: HTMLElement,  // Where to attach
  $rootNode: INode              // Component to render
})
```

**What it does:**
1. Creates a scheduler (manages timing)
2. Runs all streams in the component tree
3. Attaches the DOM to `rootAttachment`
4. Sets up automatic cleanup on disposal

### Component Invocation Pattern

Components are invoked **twice**:

```typescript
// 1. First call: pass input streams
const componentWithInputs = $Counter(value)

// 2. Second call: wire output behaviors
const renderedComponent = componentWithInputs({
  valueChange: valueChangeTether()
})
```

**If no inputs:**
```typescript
const $App = component(() => [/* ... */])

// First call: no inputs (but must call)
// Second call: no outputs (but must call)
$App()({})
```

**If inputs but no outputs:**
```typescript
const $Display = (value: IStream<number>) =>
  component(() => [
    $text(map(String, value)),
    {}  // No outputs
  ])

// First call: pass input
// Second call: no outputs
$Display(someValue)({})
```

**If outputs but no inputs:**
```typescript
const $Button = component((
  [click, clickTether]: IBehavior<Node, PointerEvent>
) => [
  $button(clickTether(nodeEvent('click')))('Click'),
  { click }
])

// First call: no inputs
// Second call: wire output
$Button()({
  click: clickTether()
})
```

### Document Structure

**Typical setup:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>My App</title>
</head>
<body>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

```typescript
// src/main.ts
import { render } from 'aelea/ui'
import { $App } from './pages/$App'

render({
  rootAttachment: document.body,
  $rootNode: $App()({})
})
```

### Multiple Root Components

You can render multiple independent components:

```typescript
render({
  rootAttachment: document.querySelector('#header'),
  $rootNode: $Header()({})
})

render({
  rootAttachment: document.querySelector('#main'),
  $rootNode: $Main()({})
})

render({
  rootAttachment: document.querySelector('#footer'),
  $rootNode: $Footer()({})
})
```

### Cleanup

Components automatically clean up when disposed:

```typescript
const { dispose } = render({
  rootAttachment: document.body,
  $rootNode: $App()({})
})

// Later: clean up everything
dispose()
```

---

## Common Patterns

### Derived State

**Computing values from state:**
```typescript
const $ShoppingCart = ({ items }: { items: IStream<Item[]> }) =>
  component(() => {
    // Derive total from items
    const total = map(
      items => items.reduce((sum, item) => sum + item.price, 0),
      items
    )

    const itemCount = map(items => items.length, items)

    return [
      $div()(
        $text(map(n => `${n} items`, itemCount)),
        $text(map(t => `Total: $${t.toFixed(2)}`, total))
      ),
      {}
    ]
  })
```

### Form Handling

**Input fields:**
```typescript
const $NameForm = component((
  [input, inputTether]: IBehavior<Node, InputEvent>,
  [submit, submitTether]: IBehavior<Node, SubmitEvent>
) => {
  // Capture input value
  const name = state(
    map(e => (e.target as HTMLInputElement).value, input),
    ''
  )

  // Validate
  const isValid = map(name => name.length >= 3, name)

  return [
    $element('form')(
      submitTether(nodeEvent('submit'))
    )(
      $input(
        attr({ type: 'text', placeholder: 'Your name' }),
        inputTether(nodeEvent('input'))
      ),

      $button(
        attrBehavior(
          map(valid => ({ disabled: !valid }), isValid)
        )
      )('Submit')
    ),
    { name, submit }
  ]
})
```

### Conditional Rendering

**Using switchMap:**
```typescript
const $Conditional = ({ isLoggedIn }: { isLoggedIn: IStream<boolean> }) =>
  component(() => {
    return [
      switchMap(isLoggedIn =>
        isLoggedIn
          ? $div()($text('Welcome back!'))
          : $div()($text('Please log in'))
      , isLoggedIn),
      {}
    ]
  })
```

### Loading States

**Handling async data:**
```typescript
import { fromPromise } from 'aelea/stream'
import { switchMap, map } from 'aelea/stream'

const $UserProfile = ({ userId }: { userId: IStream<string> }) =>
  component(() => {
    const userData = switchMap(
      userId => fromPromise(
        fetch(`/api/user/${userId}`).then(r => r.json())
      ),
      userId
    )

    return [
      switchMap(user =>
        $div()(
          $text(`Name: ${user.name}`),
          $text(`Email: ${user.email}`)
        )
      , userData),
      {}
    ]
  })
```

**With loading indicator:**
```typescript
import { merge, map, constant } from 'aelea/stream'

const $AsyncData = ({ trigger }: { trigger: IStream<void> }) =>
  component(() => {
    const data = switchMap(
      () => fromPromise(fetch('/api/data').then(r => r.json())),
      trigger
    )

    // Track loading state
    const loading = merge(
      map(() => true, trigger),      // Start loading
      map(() => false, data)          // Stop loading
    )

    return [
      $div()(
        switchMap(isLoading =>
          isLoading
            ? $text('Loading...')
            : switchMap(data =>
                $text(`Data: ${JSON.stringify(data)}`)
              , data)
        , loading)
      ),
      {}
    ]
  })
```

### Global State

**Using multicast and state:**
```typescript
// store.ts
import { state, behavior } from 'aelea/stream-extended'

// Create global behaviors
export const [userChange, userChangeTether] = behavior<User | null>()

// Create global state
export const currentUser = state(userChange, null)
```

```typescript
// $Header.ts
import { currentUser } from './store'

const $Header = component(() => {
  return [
    $div()(
      switchMap(user =>
        user
          ? $text(`Welcome, ${user.name}`)
          : $text('Not logged in')
      , currentUser)
    ),
    {}
  ]
})
```

```typescript
// $LoginButton.ts
import { userChangeTether } from './store'

const $LoginButton = component((
  [click, clickTether]: IBehavior<Node, PointerEvent>
) => {
  const login = switchMap(
    () => fromPromise(fetch('/api/login').then(r => r.json())),
    click
  )

  return [
    $button(clickTether(nodeEvent('click')))('Login'),
    {
      login: userChangeTether(login)  // Update global state
    }
  ]
})
```

### Animations

**Spring physics:**
```typescript
import { motion } from 'aelea/ui'

const $AnimatedBox = ({ x }: { x: IStream<number> }) =>
  component(() => {
    // Smooth spring animation
    const animatedX = motion(
      { stiffness: 170, damping: 26 },
      x
    )

    return [
      $div(
        styleBehavior(
          map(x => ({ transform: `translateX(${x}px)` }), animatedX)
        )
      )('Smooth!'),
      {}
    ]
  })
```

### Routing

**Basic routing:**
```typescript
import { create, match } from 'aelea/router'
import { now } from 'aelea/stream'

const $App = component(() => {
  // Create router
  const router = create({
    fragmentsChange: hashChange,
    fragment: location.hash.slice(1)
  })

  // Define routes
  const homeRoute = router.create({ fragment: 'home' })
  const aboutRoute = router.create({ fragment: 'about' })

  return [
    $div()(
      match(homeRoute)(now($HomePage()({}))),
      match(aboutRoute)(now($AboutPage()({})))
    ),
    {}
  ]
})
```

---

## Project Structure

### Monorepo Layout

```
/home/user/aelea/
├── aelea/              # Library package
│   ├── src/            # Source code
│   │   ├── stream/                  # Core streams
│   │   ├── stream-extended/         # Behaviors, multicast, state
│   │   ├── ui/                      # DOM rendering
│   │   ├── ui-components/           # Pre-built components
│   │   ├── ui-components-theme/     # Theming
│   │   └── router/                  # Routing
│   ├── dist/           # Build output
│   └── package.json
├── website/            # Documentation site
│   ├── src/
│   │   ├── pages/
│   │   │   └── examples/  # Live examples
│   │   └── main.ts
│   └── package.json
└── package.json        # Monorepo root
```

### Module Imports

**Seven distinct modules:**
```typescript
// Core streams
import { map, filter, merge } from 'aelea/stream'
import { now, periodic } from 'aelea/stream'

// Extended streams
import { behavior, state, multicast } from 'aelea/stream-extended'
import type { IBehavior } from 'aelea/stream-extended'

// UI
import { $element, $text, component } from 'aelea/ui'
import { style, attr, nodeEvent } from 'aelea/ui'
import { render } from 'aelea/ui'

// Components
import { $Button, $TextField, $row, $column } from 'aelea/ui-components'
import { layoutSheet, spacing } from 'aelea/ui-components'

// Theme
import { pallete } from 'aelea/ui-components-theme'

// Theme browser
import { setTheme } from 'aelea/ui-components-theme-browser'

// Router
import { create, match } from 'aelea/router'
```

### Key Files

**Library:**
- `/home/user/aelea/aelea/src/stream/types.ts` - Core interfaces
- `/home/user/aelea/aelea/src/ui/render.ts` - Rendering engine
- `/home/user/aelea/aelea/src/ui/combinator/component.ts` - Component abstraction

**Examples:**
- `/home/user/aelea/website/src/pages/examples/count-counters/` - Counter example
- `/home/user/aelea/website/src/pages/examples/todo-app/` - TodoMVC

**Config:**
- `/home/user/aelea/package.json` - Monorepo config
- `/home/user/aelea/biome.json` - Linting rules
- `/home/user/aelea/tsconfig.base.json` - TypeScript config

---

## Development Workflow

### Setup

```bash
# Install dependencies
bun install

# Build library
cd aelea
bun run build

# Start dev server (website)
cd website
bun run dev
```

### Code Conventions

**Naming:**
- UI components: `$ComponentName` ($ prefix)
- Stream variables: `streamName` (no suffix needed - type tells you it's a stream)
- Behaviors: `[stream, streamTether]`
- Files: `$ComponentName.ts`

**TypeScript:**
- Use `import type` for type-only imports
- Use `export type` for type-only exports
- Imports must include `.js` extension (ESM)
- Strict mode enabled

**Linting:**
```bash
# Check code
bun run biome:check

# Auto-fix
bun run biome:check:fix
```

### Adding Components

**1. Create component file:**
```typescript
// aelea/src/ui-components/components/$MyComponent.ts
import { component } from '../../ui/index.js'

export const $MyComponent = (props) =>
  component(() => {
    return [/* UI */, /* outputs */]
  })
```

**2. Export from module:**
```typescript
// aelea/src/ui-components/index.ts
export { $MyComponent } from './components/$MyComponent.js'
```

**3. Add example:**
```typescript
// website/src/pages/examples/my-component/$MyComponentExample.ts
export const $MyComponentExample = component(() => {
  return [$MyComponent({})({}) , {}]
})
```

### Git Workflow

**Branches:**
- Feature branches: `claude/description-<session-id>`
- Branch must start with `claude/` for CI

**Commits:**
- Format: `type: description`
- Types: `feat`, `fix`, `refactor`, `docs`, `chore`
- Example: `feat: add $Tooltip component`

**Versioning:**
```bash
# Create changeset
npx changeset

# Version packages
bun run changeset:version

# Publish
bun run changeset:publish
```

### Common Commands

```bash
# Build everything
bun run build

# Build library only
bun run aelea:build

# Build website only
bun run website:build

# Lint
bun run biome:check

# Fix linting
bun run biome:check:fix

# Sherif (workspace validation)
bun run sherif
```

---

## Quick Reference

### Stream Combinators

| Combinator | Purpose | Diagram |
|------------|---------|---------|
| `map` | Transform values | `-1-2-3-> => -2-4-6->` |
| `filter` | Keep matching values | `-1-2-3-4-> => --2---4->` |
| `merge` | Combine streams | `A: -1-3-> B: --2-4-> => -1234->` |
| `combine` | Latest from all | `A: -a--b-> B: --1--2-> => --A-B-C->` |
| `sample` | Sample on events | `A: -1-2-3-> B: --x--x-> => --2---3->` |
| `switchLatest` | Switch to latest | Cancels previous inner stream |
| `debounce` | Wait for silence | `-abc---def-> => ---c------f->` |
| `throttle` | Limit rate | `-xxxxxx-> => -x--x--x->` |

### Component Signature

```typescript
const $Component = (input: IStream<Input>) =>
  component((
    [behavior1, behavior1Tether]: IBehavior<TMsg, TReq>,
    [behavior2, behavior2Tether]: IBehavior<TMsg, TReq>
  ) => {
    return [
      $div(/* UI */),
      { output }
    ]
  })
```

### Element Composition

```typescript
// Factory
const $div = $element('div')

// Operations + children
$div(
  style({ padding: '20px' }),
  attr({ id: 'container' })
)(
  $text('Child 1'),
  $text('Child 2')
)
```

### State Management

```typescript
// Create stateful stream
const state = state(changes, initialValue)

// Create behavior
const [stream, tether] = behavior<T>()

// Multicast expensive operations
const shared = multicast(expensiveStream)
```

---

**Last Updated:** 2025-11-15

For more details, see:
- `/home/user/aelea/README.md` - Main documentation
- `/home/user/aelea/aelea/src/stream/README.md` - Stream library docs
- `/home/user/aelea/website/src/pages/examples/` - Live examples
