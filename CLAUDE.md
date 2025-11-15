# CLAUDE.md - AI Assistant Guide for Aelea

A practical guide for building UIs with Aelea, a functional reactive framework built on composable streams.

## Quick Start - Build UI in 3 Steps

1. **Create streams** → Data over time
2. **Compose streams** → Transform and combine data
3. **Wire to DOM** → Render with components

---

## Essential Concepts

### Streams - Values Over Time

```typescript
import { now, periodic, map } from 'aelea/stream'

const greeting = now('Hello')           // Hello|
const tick = periodic(1000)             // -0-1-2-3->
const doubled = map(n => n * 2, tick)   // -0-2-4-6->
```

**Diagrams:** `-` = time, letters/numbers = values, `|` = complete, `>` = continues

### Components - UI + Behaviors

```typescript
const $Counter = (value: IStream<number>) =>
  component((
    [increment, incrementTether]: IBehavior<Node, PointerEvent>
  ) => {
    return [
      $button(incrementTether(nodeEvent('click')))($text('+')),
      { valueChange: sampleMap(v => v + 1, value, increment) }
    ]
  })
```

**Pattern:** Receive state → Return `[UI, outputs]`

### The `o()` Composition Function

**Most important function** - composes operations left-to-right:

```typescript
import { o } from 'aelea/stream'

// o(f, g, h) means: apply f, then g, then h
const extractNumber = o(
  map((str: string) => Number(str)),
  start(0)
)

// Compose element operations
$row(o(spacing.default, style({ alignItems: 'center' })))

// Compose behaviors
incrementTether(o(nodeEvent('click'), constant(1)))
```

---

## Stream Operators - Essential Toolkit

### Creating Streams

```typescript
import { now, just, periodic, fromIterable, fromPromise } from 'aelea/stream'

now(42)                    // Emits immediately: 42>
just(42)                   // Emits once: 42|
periodic(1000)             // Every second: -0-1-2-3->
fromIterable([1, 2, 3])    // From array: 123|
fromPromise(fetch(...))    // From promise: ------data|
```

### Transforming

```typescript
import { map, filter, start, constant } from 'aelea/stream'

map(n => n * 2, stream)           // Transform values
filter(n => n > 0, stream)        // Keep matching
start(0, stream)                  // Prepend value: 0-a-b-c->
constant(42, stream)              // Map to constant: -42-42-42->
```

### Combining

```typescript
import { merge, combine, combineMap, sample, sampleMap } from 'aelea/stream'

// Merge events from multiple streams
merge(streamA, streamB)
// A: -1---3---5->
// B: --2---4---->
// R: -12-34-5--->

// Combine latest values (as object)
combine({ name, age })
// name: -Alice---Bob->
// age:  ---25------30->
// R:    ---{Alice,25}-{Bob,25}-{Bob,30}->

// Combine latest values (with function)
combineMap((n, a) => ({ name: n, age: a }), name, age)

// Sample one stream when another emits
sample(position, clicks)
// pos:   -0-1-2-3-4-5->
// click: ----x-----x--->
// R:     ----2-----5--->

// Sample and transform
sampleMap(v => v + 1, value, clicks)
```

### Higher-Order

```typescript
import { switchMap, switchLatest, joinMap, until } from 'aelea/stream'

// Switch to latest inner stream (cancels previous)
switchMap(query =>
  fromPromise(fetch(`/api?q=${query}`))
, queryChanges)

// Flatten all inner streams (runs concurrently)
joinMap(item => $ItemComponent(item), itemList)

// Take until signal
until(remove)($Component(...))  // Stop when remove emits
```

### Timing

```typescript
import { debounce, throttle, delay, skip, take } from 'aelea/stream'

debounce(300, typing)     // Wait for silence
throttle(100, scroll)     // Limit rate
delay(1000, clicks)       // Delay all events
skip(2, stream)           // Skip first 2
take(3, stream)           // Take first 3
```

### Utilities

```typescript
import { skipRepeats, skipRepeatsWith } from 'aelea/stream'

skipRepeats(stream)                          // Skip consecutive duplicates
skipRepeatsWith((a, b) => a.id === b.id, stream)  // Custom equality
```

---

## Building Components

### Element Creation

```typescript
import { $element, $custom, $text, $node } from 'aelea/ui'

// HTML elements
const $div = $element('div')
const $button = $element('button')

// Custom elements (semantic)
const $row = $custom('row')
const $column = $custom('column')

// Generic wrapper (for styling)
const $label = $node(style({ color: 'gray' }))($text('Label'))

// Text nodes
$text('Static')
$text(map(String, numberStream))
```

### Curried Composition

```typescript
// Phase 1: Apply operations
$div(
  style({ padding: '20px' }),
  attr({ id: 'container' })
)
// Phase 2: Add children
(
  $text('Child 1'),
  $text('Child 2')
)
```

### Styling

```typescript
import { style, styleBehavior } from 'aelea/ui'

// Static
$div(style({
  padding: '20px',
  ':hover': { opacity: 0.8 },
  '@media (max-width: 768px)': { padding: '10px' }
}))

// Reactive
$div(styleBehavior(
  map(x => ({ transform: `translateX(${x}px)` }), position)
))
```

### Events

```typescript
import { nodeEvent } from 'aelea/ui'

component((
  [click, clickTether]: IBehavior<Node, PointerEvent>
) => {
  return [
    $button(clickTether(nodeEvent('click')))('Click me'),
    { click }
  ]
})
```

### Tether Transformations

Tethers can transform streams before wiring:

```typescript
// Pass through unchanged
clickTether()

// Transform stream
clickTether(map(e => e.clientX))

// Compose transformations with o()
clickTether(o(
  nodeEvent('click'),
  map(e => e.clientX),
  filter(x => x > 100)
))

// Map to constant
removeTether(constant(index))
```

---

## Component Patterns

### Parent-Child State Flow

```typescript
import { state } from 'aelea/stream-extended'

// Child: receives state, outputs changes
const $Counter = (value: IStream<number>) =>
  component((
    [increment, incrementTether]: IBehavior<Node, PointerEvent>
  ) => [
    $button(incrementTether(nodeEvent('click')))('+'),
    { valueChange: sampleMap(v => v + 1, value, increment) }
  ])

// Parent: owns state, wires child
const $App = component((
  [valueChange, valueChangeTether]: IBehavior<number>
) => {
  const count = state(valueChange, 0)  // Initial: 0

  return [
    $Counter(count)({ valueChange: valueChangeTether() }),
    {}
  ]
})
```

### Dynamic Lists - Pattern 1: Fixed Structure

Use when list items can update but not be added/removed:

```typescript
import { skipRepeatsWith, switchMap, skipRepeats } from 'aelea/stream'

const $CounterList = ({ counterList }: { counterList: IStream<number[]> }) =>
  component((
    [updateCounter, updateCounterTether]: IBehavior<number, { index: number, value: number }>
  ) => {
    // Only re-render when length changes
    const listByLength = skipRepeatsWith(
      (a, b) => a.length === b.length,
      counterList
    )

    return [
      switchMap(list =>
        $column()(
          ...list.map((_, index) => {
            // Each item gets optimized stream
            const value = skipRepeats(
              map(list => list[index], counterList)
            )

            return $Counter(value)({
              valueChange: updateCounterTether(
                map(newValue => ({ index, value: newValue }))
              )
            })
          })
        )
      , listByLength),
      {}
    ]
  })
```

### Dynamic Lists - Pattern 2: Add/Remove Items

Use when items can be dynamically added/removed:

```typescript
import { joinMap, until, merge, fromIterable } from 'aelea/stream'
import { behavior } from 'aelea/stream-extended'

const $TodoList = ({ newTodo, initialTodos }) =>
  component(() => {
    return [
      $column()(
        joinMap(
          (todo: Todo) => {
            // Create behaviors for THIS item
            const [remove, removeTether] = behavior<MouseEvent>()
            const [complete, completeTether] = behavior<boolean>()

            // until(remove) disposes this component when remove emits
            return until(remove)(
              $TodoItem({ todo })({
                remove: removeTether(),
                complete: completeTether()
              })
            )
          },
          merge(newTodo, fromIterable(initialTodos))
        )
      ),
      {}
    ]
  })
```

**Key difference:**
- `switchMap` + `skipRepeatsWith` = Re-render optimization
- `joinMap` + `until` = Dynamic lifecycle control

### List State Management

Standard patterns for array updates:

```typescript
const counterList = state(
  merge(
    // Add item
    sampleMap(list => [...list, 0], counterList, addCounter),

    // Remove item by index
    sampleMap(
      (list, index) => list.filter((_, i) => i !== index),
      counterList,
      removeCounter
    ),

    // Update item at index
    sampleMap(
      (list, { index, value }) => {
        const newList = [...list]
        newList[index] = value
        return newList
      },
      counterList,
      updateCounter
    )
  ),
  [0, 0]  // Initial list
)
```

### Form Input Pattern

```typescript
const $Form = component((
  [submit, submitTether]: IBehavior<PointerEvent>,
  [inputChange, inputChangeTether]: IBehavior<string>
) => {
  // Current value with initial
  const inputState = start('', inputChange)

  // Reset to empty on submit
  const value = merge(
    inputChange,
    constant('', submit)  // Clear on submit
  )

  // Validation
  const disabled = map(text => text.length < 3, value)

  // Sample value on submit
  const formData = sample(inputState, submit)

  return [
    $row()(
      $input(
        attr({ type: 'text' }),
        inputChangeTether(nodeEvent('input'))
      ),
      $button(
        attrBehavior(map(d => ({ disabled: d }), disabled)),
        submitTether(nodeEvent('click'))
      )('Submit')
    ),
    { formData }
  ]
})
```

### Conditional Rendering

```typescript
import { empty } from 'aelea/stream'

// Pattern 1: switchMap with ternary
switchMap(isLoggedIn =>
  isLoggedIn
    ? $Dashboard()
    : $LoginForm()
, isLoggedIn)

// Pattern 2: combineMap for multiple conditions
combineMap(
  (showCompleted, isCompleted) =>
    showCompleted === isCompleted
      ? $TodoItem(...)
      : empty,  // Render nothing
  showCompleteState,
  isCompleted
)
```

### Derived State

```typescript
// From existing state
const total = map(
  items => items.reduce((sum, item) => sum + item.price, 0),
  items
)

const itemCount = map(items => items.length, items)

const isValid = map(name => name.length >= 3, name)

const isEmpty = map(list => list.length === 0, list)
```

### Global State

```typescript
// store.ts
import { state, behavior } from 'aelea/stream-extended'

export const [userChange, userChangeTether] = behavior<User | null>()
export const currentUser = state(userChange, null)
```

```typescript
// $Header.ts
import { currentUser } from './store'

const $Header = component(() => {
  return [
    switchMap(user =>
      user ? $text(`Hello ${user.name}`) : $text('Guest')
    , currentUser),
    {}
  ]
})
```

```typescript
// $LoginButton.ts
import { userChangeTether } from './store'

const $LoginButton = component((
  [login, loginTether]: IBehavior<User>
) => {
  return [
    $button(loginTether())('Login'),
    { login: userChangeTether(login) }  // Update global
  ]
})
```

---

## Rendering to Page

```typescript
import { render } from 'aelea/ui'

const $App = component(() => [
  $div()($text('Hello, Aelea!')),
  {}
])

render({
  rootAttachment: document.body,
  $rootNode: $App()({})  // Double-call: inputs, then outputs
})
```

**Component invocation:**
```typescript
// With inputs
$Counter(valueStream)({ valueChange: tether })

// No inputs, no outputs
$App()({})

// Inputs, no outputs
$Display(stream)({})

// No inputs, with outputs
$Button()({ click: tether })
```

---

## Pre-built Components

```typescript
import { $Button, $TextField, $row, $column, $card } from 'aelea/ui-components'
import { spacing, layoutSheet } from 'aelea/ui-components'
import { pallete } from 'aelea/ui-components-theme'

// Layout helpers (pre-styled custom elements)
$row(spacing.default)(/* children */)
$column(spacing.large)(/* children */)
$card(/* children */)  // Styled column with elevation

// Form components
$TextField({ label: 'Username', value })({ userChange: tether })
$Button({ $content: $text('Submit'), disabled })({ click: tether })

// Spacing (gap between flex items)
spacing.tiny     // 4px
spacing.small    // 8px
spacing.default  // 12px
spacing.big      // 16px
spacing.large    // 24px

// Layout sheets (style presets)
layoutSheet.row
layoutSheet.column
layoutSheet.spaceBetween
layoutSheet.alignCenter
```

---

## Advanced Patterns

### Performance - Multicast

Share expensive computations:

```typescript
import { multicast } from 'aelea/stream-extended'

const expensiveData = multicast(
  switchMap(id => fromPromise(fetch(`/api/data/${id}`)), idStream)
)

// Multiple subscribers share single fetch
map(data => data.name, expensiveData)
filter(data => data.active, expensiveData)
```

### IntersectionObserver - Infinite Scroll

```typescript
import { observer } from 'aelea/ui-components'

const $InfiniteList = component((
  [intersecting, intersectingTether]: IBehavior<IntersectionObserverEntry>
) => {
  const loadMore = map(
    entry => entry.isIntersecting,
    intersecting
  )

  return [
    $column()(
      switchMap(items => /* render items */, itemList),

      // Observer at bottom triggers load
      $custom('observer')(
        intersectingTether(
          observer.intersection({ threshold: 1 }),
          map(entries => entries[0])
        )
      )()
    ),
    { loadMore }
  ]
})
```

### Animations

```typescript
import { motion } from 'aelea/ui'

const $Box = ({ x }: { x: IStream<number> }) =>
  component(() => {
    const animated = motion(
      { stiffness: 170, damping: 26 },
      x
    )

    return [
      $div(styleBehavior(
        map(x => ({ transform: `translateX(${x}px)` }), animated)
      ))('Smooth!'),
      {}
    ]
  })
```

### DOM Insertion Control

```typescript
// Default: append children (insertAscending: true)
$column()(child1, child2, child3)

// Prepend children (insertAscending: false)
$column(
  map(node => ({ ...node, insertAscending: false }))
)(child1, child2, child3)
```

---

## Quick Reference

### Most-Used Stream Operators

| Operator | Purpose | Example |
|----------|---------|---------|
| `now` | Immediate value | `now(42)` → `42>` |
| `just` | Single emission | `just(42)` → `42\|` |
| `map` | Transform | `map(x => x * 2, s)` |
| `filter` | Keep matching | `filter(x => x > 0, s)` |
| `merge` | Combine streams | `merge(a, b)` |
| `sample` | Sample on event | `sample(val, clicks)` |
| `sampleMap` | Sample + transform | `sampleMap(v => v+1, val, clicks)` |
| `switchMap` | Switch to latest | `switchMap(x => fetch(x), query)` |
| `start` | Prepend value | `start(0, s)` → `0-a-b->` |
| `constant` | Map to constant | `constant(42, s)` → `-42-42->` |
| `until` | Take until signal | `until(stop)(stream)` |
| `o` | Compose ops | `o(f, g, h)` = h∘g∘f |

### Component Skeleton

```typescript
const $Component = (input: IStream<T>) =>
  component((
    [event, eventTether]: IBehavior<TMsg, TReq>
  ) => {
    const derived = map(fn, input)

    return [
      $div(
        eventTether(nodeEvent('click'))
      )(
        $text(map(String, derived))
      ),
      { output: event }
    ]
  })
```

### State Management

```typescript
import { state, behavior } from 'aelea/stream-extended'

// Create stateful stream
const count = state(changes, initialValue)

// Create behavior pair
const [stream, tether] = behavior<T>()

// Multicast expensive stream
const shared = multicast(expensiveStream)
```

### Common Patterns Checklist

- ✓ Use `o()` to compose operations
- ✓ Use `start()` for initial values
- ✓ Use `constant()` to map events to values
- ✓ Use `sampleMap()` to read state on events
- ✓ Use `skipRepeats()` to optimize re-renders
- ✓ Use `switchMap()` for dynamic rendering
- ✓ Use `joinMap() + until()` for add/remove items
- ✓ Use `empty` for conditional hiding
- ✓ Use `multicast()` for expensive operations
- ✓ Use `$node()` for generic styling wrappers

---

## Project Structure

```
/home/user/aelea/
├── aelea/src/
│   ├── stream/              # Core reactive streams
│   ├── stream-extended/     # Behaviors, state, multicast
│   ├── ui/                  # DOM rendering
│   ├── ui-components/       # Pre-built components
│   └── router/              # Client-side routing
└── website/src/examples/    # Real-world examples
```

### Module Imports

```typescript
// Streams
import { map, filter, merge, o } from 'aelea/stream'
import { now, periodic, fromPromise } from 'aelea/stream'

// Extended
import { behavior, state, multicast } from 'aelea/stream-extended'
import type { IBehavior } from 'aelea/stream-extended'

// UI
import { $element, $text, component, render } from 'aelea/ui'
import { style, attr, nodeEvent } from 'aelea/ui'

// Components
import { $Button, $row, $column, spacing } from 'aelea/ui-components'
```

---

## Development Workflow

```bash
# Setup
bun install
cd aelea && bun run build

# Development
cd website && bun run dev

# Lint
bun run biome:check
bun run biome:check:fix
```

### Code Conventions

- Components: `$ComponentName`
- Stream variables: `streamName` (no suffix)
- Behaviors: `[stream, streamTether]`
- Files: `$ComponentName.ts`
- Imports: `.js` extension (ESM)
- Types: `import type` / `export type`

---

**Last Updated:** 2025-11-15

**See also:**
- `/home/user/aelea/README.md` - Main docs
- `/home/user/aelea/aelea/src/stream/README.md` - Stream details
- `/home/user/aelea/website/src/pages/examples/` - Live examples
