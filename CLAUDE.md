# CLAUDE.md - AI Assistant Guide for Aelea

This document provides comprehensive guidance for AI assistants working with the Aelea codebase. Last updated: 2025-11-15

## Table of Contents

1. [Project Overview](#project-overview)
2. [Repository Structure](#repository-structure)
3. [Core Architecture Patterns](#core-architecture-patterns)
4. [Development Workflows](#development-workflows)
5. [Code Conventions](#code-conventions)
6. [Module Deep Dive](#module-deep-dive)
7. [Testing & Benchmarking](#testing--benchmarking)
8. [Common Tasks](#common-tasks)
9. [Important Constraints](#important-constraints)

---

## Project Overview

**Aelea** is a functional reactive UI framework built on composable streams. It combines reactive programming with direct DOM manipulation to create dynamic user interfaces without virtual DOM or state management layers.

### Key Characteristics

- **Type:** Monorepo with 2 workspaces (aelea library + documentation website)
- **Language:** TypeScript 5.9.2 (strict mode, ES2023 target)
- **Package Manager:** Bun 1.2.19
- **License:** MIT
- **Author:** Nissan Hanina <nissanhanina@gmail.com>
- **Current Version:** 2.5.31 (aelea package)

### Core Philosophy

1. **Streams drive everything** - All data flows through `IStream<T>`
2. **Composition over configuration** - Complex behaviors from simple, composable parts
3. **Direct DOM updates** - No virtual DOM diffing
4. **Lazy evaluation** - Streams don't execute until subscribed
5. **Explicit side effects** - Effects isolated in streams, pure transformations elsewhere

---

## Repository Structure

### Root Directory

```
/home/user/aelea/
├── aelea/                    # Main library package
├── website/                  # Documentation site & examples
├── .changeset/               # Changesets for version management
├── .github/workflows/        # CI/CD (release.yml)
├── .vscode/                  # VSCode settings
├── package.json              # Monorepo root
├── bun.lock                  # Lockfile
├── tsconfig.base.json        # Shared TypeScript config
├── biome.json                # Linter/formatter config
├── README.md                 # Main documentation
└── GEMINI.md                 # AI assistant overview
```

### aelea/ Package Structure

Location: `/home/user/aelea/aelea/`

```
aelea/
├── src/
│   ├── stream/               # Core reactive streams (45 files)
│   ├── stream-extended/      # Advanced stream utilities (16 files)
│   ├── ui/                   # DOM rendering system (13 files)
│   ├── ui-components/        # Pre-built components (23 files)
│   ├── ui-components-theme/  # Theming system
│   ├── ui-components-theme-browser/  # Browser theme loading
│   └── router/               # Client-side routing (4 files)
├── benchmark/                # Performance benchmarks
├── dist/                     # Build output (gitignored)
│   ├── esm/                  # Compiled JavaScript
│   └── types/                # TypeScript declarations
├── package.json              # Package config with 7 module exports
└── tsconfig.json             # Build configuration
```

### Module Exports (7 distinct entry points)

1. **`aelea/stream`** - Core reactive stream library
2. **`aelea/stream-extended`** - Behaviors, multicast, state
3. **`aelea/ui`** - DOM rendering, elements, styles
4. **`aelea/ui-components`** - Pre-built UI components
5. **`aelea/ui-components-theme`** - Theming system
6. **`aelea/ui-components-theme-browser`** - Browser theme utilities
7. **`aelea/router`** - Client-side routing

### website/ Package Structure

Location: `/home/user/aelea/website/`

```
website/
├── src/
│   ├── main.ts               # Entry point
│   ├── pages/
│   │   ├── $Website.ts       # Main layout
│   │   ├── $MainMenu.ts      # Navigation
│   │   ├── guide/            # Documentation guide
│   │   └── examples/         # 8 live interactive examples
│   ├── components/           # Shared UI components
│   └── elements/             # Common elements
├── index.html                # HTML template
├── vite.config.ts            # Vite bundler config
├── railway.json              # Railway deployment
└── package.json
```

---

## Core Architecture Patterns

### 1. Functional Reactive Programming (FRP)

**Streams as first-class values:**
```typescript
// Streams represent values over time
const counter$: IStream<number> = periodic(1000)
const doubled$ = map(x => x * 2, counter$)
```

**Lazy evaluation:**
```typescript
// Stream definition (no execution)
const stream$ = map(x => x + 1, source$)

// Execution only happens when run() is called
stream$.run(sink, scheduler)
```

**Pure transformations:**
```typescript
// All operators are pure functions
const result = map(fn, stream)  // Returns new stream, doesn't mutate
```

### 2. Component Architecture

**Core Pattern: Input State → Output Changes**

```typescript
// Component signature
const $Component = (inputState$: IStream<State>) =>
  component((
    [eventStream$, eventTether]: IBehavior<Node, Event>
  ) => {
    // Return tuple: [UI, outputs]
    return [
      $div(/* UI */),
      {
        stateChange$: /* output stream */
      }
    ]
  })
```

**Key principles:**
- Components receive state as input streams (never manage state internally)
- Components output state changes via behaviors
- Parent components own and manage state
- Bidirectional flow via tethers

**Example:**
```typescript
// Child receives state, outputs changes
const $Counter = (value$: IStream<number>) => component((
  [click$, clickTether]: IBehavior<Node, MouseEvent>
) => {
  return [
    $button(clickTether(nodeEvent('click')))(
      $text(map(String, value$))
    ),
    { increment$: sampleMap(v => v + 1, value$, click$) }
  ]
})

// Parent owns state
const $App = component((
  [increment$, incrementTether]: IBehavior<number>
) => {
  const count$ = state(increment$, 0)  // Parent manages state

  return [
    $Counter(count$)({
      increment$: incrementTether()  // Wire child output to state
    })
  ]
})
```

### 3. Element Composition via Currying

**Two-phase function application:**

```typescript
// Phase 1: Apply operations (styles, attributes, events)
$div(
  style({ padding: '20px' }),
  attribute({ id: 'container' }),
  eventTether(nodeEvent('click'))
)
// Phase 2: Add children (terminal operation)
(
  $text('Hello'),
  $button()('Click me')
)
```

**How it works:**
- Element factories return curried functions
- First call composes operations via `o()` (function composition)
- Second call renders with children

### 4. Direct DOM Manipulation

**No Virtual DOM:**
- Streams update DOM nodes directly
- StyleSheet API for efficient CSS injection
- Element references maintained for updates

```typescript
// Style updates inject CSS classes dynamically
const $box = $div(
  styleBehavior(
    map(x => ({ transform: `translateX(${x}px)` }), position$)
  )
)
```

### 5. Scheduler Abstraction

**Pluggable timing control:**

```typescript
interface IScheduler {
  asap<T>(sink, task, ...args): Disposable    // Microtask
  delay<T>(sink, task, delay, ...args): Disposable  // setTimeout
  time(): number                                // Current time
  // UI-specific:
  paint?<T>(sink, task, ...args): Disposable  // requestAnimationFrame
}
```

**Implementations:**
- **BrowserScheduler:** Uses microtasks + RAF for rendering
- **NodeScheduler:** Node.js optimized (setImmediate)
- **Custom schedulers:** For testing, batching, rate-limiting

### 6. Resource Management

**Disposable pattern (TC39 proposal):**

```typescript
// Automatic cleanup with using/await using
{
  using subscription = stream$.run(sink, scheduler)
  // Automatically disposed when scope exits
}

// Manual disposal
const disposable = stream$.run(sink, scheduler)
disposable[Symbol.dispose]()
```

**SettableDisposable:**
- Swappable disposables for dynamic resources
- Disposes old resource when setting new one

### 7. Operator Fusion

**Performance optimization:**

```typescript
// Multiple maps automatically fuse
map(f, map(g, source$))
// Becomes: map(compose(g, f), source$)
// Single map operation instead of two
```

---

## Development Workflows

### Initial Setup

```bash
# Clone repository
git clone <repo-url>
cd aelea

# Install dependencies (uses Bun)
bun install

# Build library
bun run aelea:build

# Start development server (website)
cd website
bun run dev  # Opens http://localhost:3000
```

### Building

```bash
# Build entire monorepo
bun run build

# Build library only
bun run aelea:build

# Build website only
bun run website:build
```

### Linting & Formatting

```bash
# Check code with Biome
bun run biome:check

# Auto-fix issues
bun run biome:check:fix

# Auto-fix with unsafe transformations
bun run biome:check:fix:unsafe
```

### Version Management

```bash
# Create changeset (describe changes)
npx changeset

# Version packages based on changesets
bun run changeset:version

# Publish to npm
bun run changeset:publish
```

### Git Workflow

**Branch naming convention:**
- Feature branches: `claude/claude-md-<session-id>`
- CRITICAL: Branches must start with `claude/` and match session ID for push to succeed

**Commit conventions:**
- Descriptive messages following existing style
- Prefix: `feat:`, `fix:`, `refactor:`, `docs:`, etc.
- Example: `feat: update version to 2.5.31 and refactor tether implementation`

**CI/CD Pipeline (.github/workflows/release.yml):**
1. Trigger: Push to master or manual dispatch
2. Lint with Biome
3. Build both packages
4. Publish to npm via Changesets
5. Deploy website to Railway

---

## Code Conventions

### Naming Conventions

1. **$ prefix for UI components/elements**
   ```typescript
   const $div = $element('div')
   const $Counter = (props) => component(...)
   const $MyComponent = ...
   ```

2. **$ suffix for streams (optional but common)**
   ```typescript
   const value$ = now(42)
   const clicks$ = nodeEvent('click')
   ```

3. **Behavior tuple naming**
   ```typescript
   const [stream$, streamTether] = behavior<T>()
   // OR in component signature:
   [clickEvent$, clickEventTether]: IBehavior<Node, Event>
   ```

4. **File naming**
   - Components: `$ComponentName.ts`
   - Utilities: `camelCase.ts`
   - Types: `types.ts` per module

### TypeScript Conventions

**Import/export patterns:**
```typescript
// Prefer type imports
import type { IStream } from './types'
import { map, filter } from './combinators'

// Named exports only (no default exports)
export { map, filter }
export type { IStream, ISink }
```

**Module resolution:**
```typescript
// ESM with .js extensions (TypeScript requirement)
import { map } from './map.js'
import type { IStream } from '../types.js'
```

**Type definitions:**
```typescript
// Interface prefix: I
interface IStream<T> { ... }
interface ISink<T> { ... }
interface IScheduler { ... }

// Avoid explicit any, use type parameters
function process<T>(value: T): T { ... }
```

### Code Organization

**Currying utilities:**
```typescript
// Use curry2, curry3, curry4 from utils/function.ts
export const map = curry2(mapImpl)
export const sample = curry3(sampleImpl)

// Enables flexible calling:
map(fn, stream)        // Full application
map(fn)(stream)        // Curried
```

**Composition operator:**
```typescript
import { o } from './utils/function'

// Compose functions right-to-left
const composed = o(operation1, operation2, operation3)

// Used in element operations
$div(o(style1, style2, attr1))
```

**Exports structure:**
```typescript
// Each module has index.ts with explicit exports
export { map, filter, merge } from './combinator/index.js'
export { now, periodic } from './source/index.js'
export type { IStream, ISink } from './types.js'
```

### Styling Conventions

**StyleSheet-based CSS-in-JS:**
```typescript
// style() generates CSS classes dynamically
const $box = $div(
  style({
    padding: '20px',
    backgroundColor: 'blue',
    ':hover': { backgroundColor: 'darkblue' }
  })
)

// styleBehavior() for reactive styles
const $animated = $div(
  styleBehavior(
    map(x => ({ transform: `translateX(${x}px)` }), position$)
  )
)

// Layout helpers from ui-components
import { layoutSheet } from 'aelea/ui-components'
$row(layoutSheet.spaceBetween, layoutSheet.alignCenter)
```

**Color utilities:**
```typescript
import { pallete } from 'aelea/ui-components-theme'

style({
  color: pallete.message,
  backgroundColor: pallete.background
})
```

---

## Module Deep Dive

### stream/ - Core Reactive Streams

**Location:** `/home/user/aelea/aelea/src/stream/`

**Key files:**
- `types.ts` (84 lines) - Core interfaces: IStream, ISink, IScheduler
- `combinator/` - 22 stream transformation operators
- `source/` - 8 stream creation methods
- `scheduler/` - Pluggable scheduling implementations

**Core interfaces:**
```typescript
interface IStream<T> {
  run(sink: ISink<T>, scheduler: IScheduler): Disposable
}

interface ISink<T> {
  event(time: number, value: T): void
  end(time: number): void
  error(time: number, err: Error): void
}

interface IScheduler {
  asap<T>(sink: ISink<T>, task: Task<T>, ...args): Disposable
  delay<T>(sink: ISink<T>, task: Task<T>, delay: number, ...args): Disposable
  time(): number
}
```

**Most-used combinators:**
- `map` - Transform values (auto-fuses)
- `filter` - Filter by predicate
- `merge` - Merge multiple streams
- `switchLatest` - Switch to latest inner stream
- `sample` - Sample values from streams
- `combine` - Combine latest values
- `aggregate` - Reduce with seed (like scan)

**Most-used sources:**
- `now` - Emit single value immediately
- `periodic` - Emit at regular intervals
- `fromPromise` - Convert promise to stream
- `fromIterable` - Convert array/iterable to stream

**Performance notes:**
- Map operations automatically fuse for efficiency
- Lazy evaluation prevents unnecessary work
- Scheduler abstraction enables batching

### stream-extended/ - Advanced Utilities

**Location:** `/home/user/aelea/aelea/src/stream-extended/`

**Key concepts:**

**Behavior (bidirectional stream):**
```typescript
// Create behavior tuple
const [stream$, tether] = behavior<T>()

// stream$: IStream<T> - receives values
// tether: (input: IStream<T>) => IStream<T> - sends values

// Usage in components
component((
  [clicks$, clickTether]: IBehavior<Node, MouseEvent>
) => {
  return [
    $button(clickTether(nodeEvent('click'))),  // Wire input to tether
    { clicks$ }  // Output stream
  ]
})
```

**State (stateful stream):**
```typescript
// Create stateful stream with initial value
const count$ = state(increments$, 0)

// Remembers last value
// New subscribers immediately get current value
```

**Multicast (share subscriptions):**
```typescript
// Expensive operation
const data$ = multicast(
  fromPromise(fetch('/api/data').then(r => r.json()))
)

// Multiple subscribers share single fetch
subscriber1.run(data$)
subscriber2.run(data$)
```

**Tether (input mechanism):**
```typescript
// Create tether
const tether = makeTether<T>()

// Push values in
tether(now(42))
tether(periodic(1000))

// Receive as stream
const output$ = tether.stream$
```

### ui/ - DOM Rendering

**Location:** `/home/user/aelea/aelea/src/ui/`

**Key files:**
- `render.ts` (296 lines) - Core rendering engine
- `scheduler.ts` (109 lines) - DOM-optimized scheduler
- `combinator/component.ts` (51 lines) - Component abstraction
- `combinator/style.ts` (96 lines) - CSS-in-JS system
- `combinator/motion.ts` (134 lines) - Spring physics animations

**Element creation:**
```typescript
import { $element, $custom, $svg, $svgNS, $text } from 'aelea/ui'

// Standard HTML elements
const $div = $element('div')
const $button = $element('button')
const $input = $element('input')

// Custom elements
const $myCard = $custom('app-card')

// SVG elements
const $circle = $svgNS('circle')
const $path = $svgNS('path')

// Text nodes
const $label = $text('Static text')
const $dynamic = $text(map(String, value$))
```

**Component definition:**
```typescript
import { component } from 'aelea/ui'
import type { IBehavior } from 'aelea/stream-extended'

const $MyComponent = component((
  [behavior1$, behavior1Tether]: IBehavior<Type1>,
  [behavior2$, behavior2Tether]: IBehavior<Type2>
) => {
  // Component implementation
  return [
    $div(/* UI */),
    { outputStream$ }
  ]
})
```

**Styling:**
```typescript
import { style, styleBehavior } from 'aelea/ui'

// Static styles
$div(style({
  padding: '20px',
  display: 'flex',
  ':hover': { backgroundColor: 'blue' },
  '@media (max-width: 768px)': { padding: '10px' }
}))

// Reactive styles
$div(styleBehavior(
  map(value => ({ opacity: value }), opacity$)
))
```

**Events:**
```typescript
import { nodeEvent } from 'aelea/ui'

$button(clickTether(nodeEvent('click')))
$input(inputTether(nodeEvent('input')))
```

**Attributes:**
```typescript
import { attr, attrBehavior } from 'aelea/ui'

// Static attributes
$input(attr({ type: 'text', placeholder: 'Enter name' }))

// Reactive attributes
$input(attrBehavior(
  map(disabled => ({ disabled }), isDisabled$)
))
```

**Animations (spring physics):**
```typescript
import { motion } from 'aelea/ui'

const animatedPosition$ = motion(
  { stiffness: 170, damping: 26 },  // Spring config
  position$  // Target values
)
```

**Running the app:**
```typescript
import { runBrowser } from 'aelea/ui'

runBrowser({
  rootNode: document.body
})(
  $App()
)
```

### ui-components/ - Pre-built Components

**Location:** `/home/user/aelea/aelea/src/ui-components/`

**Available components:**

**Layout:**
```typescript
import { $row, $column, $card } from 'aelea/ui-components'

// Flexbox row
$row(layoutSheet.spaceBetween, layoutSheet.alignCenter)(children)

// Flexbox column
$column(layoutSheet.spacing, style({ padding: '20px' }))(children)

// Card container
$card(style({ padding: '30px' }))(children)
```

**Forms:**
```typescript
import {
  $Button, $TextField, $Checkbox, $Slider, $Autocomplete
} from 'aelea/ui-components'

// Button
$Button({
  $content: $text('Click me'),
  click: click$
})

// Text field
$TextField({
  label: 'Username',
  value: value$,
  validation: validation$
})

// Checkbox
$Checkbox({
  label: $text('Accept terms'),
  checked: checked$
})
```

**Data display:**
```typescript
import { $Table, $Tabs, $VirtualScroll } from 'aelea/ui-components'

// Data table with pagination
$Table({
  columns: [
    { label: 'Name', $head: $text('Name'), $body: ... }
  ],
  data: data$,
  pageSize: 20
})

// Tab navigation
$Tabs({
  selected: selectedTab$,
  options: ['Tab 1', 'Tab 2']
})

// Virtual scroll for large lists
$VirtualScroll({
  itemHeight: 50,
  items: items$,
  $item: (item) => $div()($text(item.name))
})
```

**Overlays:**
```typescript
import { $Popover } from 'aelea/ui-components'

$Popover({
  $target: $button()('Toggle'),
  $content: $div()('Popover content'),
  open: isOpen$
})
```

**Utilities:**
```typescript
import { $NumberTicker, $Sortable } from 'aelea/ui-components'

// Animated number
$NumberTicker({
  value: value$,
  format: (n) => n.toFixed(2)
})

// Drag-and-drop sorting
$Sortable({
  items: items$,
  $item: (item) => $div()(item.name)
})
```

**Style utilities:**
```typescript
import { layoutSheet, designSheet, spacing } from 'aelea/ui-components'

// Layout utilities
layoutSheet.flex
layoutSheet.spaceBetween
layoutSheet.alignCenter
layoutSheet.spacing

// Design tokens
designSheet.btn
designSheet.input
designSheet.card

// Spacing
spacing.tiny    // 4px
spacing.small   // 8px
spacing.medium  // 16px
spacing.large   // 24px
```

### router/ - Client-side Routing

**Location:** `/home/user/aelea/aelea/src/router/`

**Key files:**
- `resolveUrl.ts` (92 lines) - URL matching logic
- `components/$Anchor.ts` - Router-aware anchor component
- `types.ts` - Route type definitions

**Router setup:**
```typescript
import { create, match } from 'aelea/router'
import { now } from 'aelea/stream'

// Create router
const router = create({
  fragmentsChange: hashChange$,  // Stream of URL changes
  fragment: window.location.hash.slice(1)
})

// Create route matchers
const homeRoute = router.create({ fragment: 'home' })
const aboutRoute = router.create({ fragment: 'about/:id' })

// Match routes to components
const $App = $div()(
  match(homeRoute)(now($HomePage())),
  match(aboutRoute)(now($AboutPage()))
)
```

**Route parameters:**
```typescript
// Route with parameters
const userRoute = router.create({ fragment: 'user/:userId' })

// Extract parameters
switchLatest(
  map(params => {
    const userId = params.userId
    return $UserProfile({ userId })
  }, userRoute)
)
```

**Navigation:**
```typescript
import { $Anchor } from 'aelea/router'

// Router-aware link
$Anchor({
  url: '/home',
  $content: $text('Home')
})
```

---

## Testing & Benchmarking

### Current State

**No formal test suite** - The project currently lacks unit/integration tests.

**Benchmarking available** at `/home/user/aelea/aelea/benchmark/`

### Running Benchmarks

```bash
cd aelea/benchmark

# Run specific benchmark
bun run combinator-characteristics.ts
bun run map-filter-reduce.ts
bun run test-map-fusion.ts

# View results
cat BENCHMARK_REPORT.md
```

### Benchmark Structure

**Tool:** Tinybench 4.0.1
**Comparison:** Benchmarks against @most/core (another reactive library)

**Available benchmarks:**
- `combinator-characteristics.ts` - Stream combinator performance
- `combinators.ts` - General combinator benchmarks
- `map-filter-reduce.ts` - Common operations
- `scan.ts` - Scan operation
- `switch.ts` - Switch operation
- `test-map-fusion.ts` - Map fusion optimization

**Benchmark results:** See `BENCHMARK_REPORT.md` for detailed performance comparisons

### Performance Considerations

**When working with the codebase:**

1. **Map fusion** - Multiple map operations automatically fuse
2. **Lazy evaluation** - Streams don't execute until run()
3. **Scheduler batching** - Use scheduler for efficient updates
4. **Multicast expensive operations** - Share subscriptions
5. **Dispose properly** - Clean up resources to prevent leaks

---

## Common Tasks

### Adding a New Stream Combinator

1. Create file in `/home/user/aelea/aelea/src/stream/combinator/`
   ```typescript
   // myOperator.ts
   import type { IStream } from '../types.js'
   import { Stream } from '../Stream.js'
   import { curry2 } from '../utils/function.js'

   const myOperatorImpl = <A, B>(fn: (a: A) => B, source: IStream<A>): IStream<B> => {
     return new Stream((sink, scheduler) => {
       // Implementation
       return source.run({
         event: (t, value) => sink.event(t, fn(value)),
         error: (t, err) => sink.error(t, err),
         end: (t) => sink.end(t)
       }, scheduler)
     })
   }

   export const myOperator = curry2(myOperatorImpl)
   ```

2. Export from `/home/user/aelea/aelea/src/stream/combinator/index.ts`
   ```typescript
   export { myOperator } from './myOperator.js'
   ```

3. Export from `/home/user/aelea/aelea/src/stream/index.ts`
   ```typescript
   export { myOperator } from './combinator/index.js'
   ```

4. Add documentation with ASCII diagrams
5. Consider adding benchmark

### Adding a New UI Component

1. Create file in `/home/user/aelea/aelea/src/ui-components/components/`
   ```typescript
   // $MyComponent.ts
   import { component, $element, style } from '../../ui/index.js'
   import type { IBehavior } from '../../stream-extended/index.js'

   export interface IMyComponent {
     value: IStream<string>
     onChange: IStream<string>
   }

   export const $MyComponent = ({ value, onChange }: IMyComponent) =>
     component((
       [change$, changeTether]: IBehavior<string>
     ) => {
       const $container = $element('div')

       return [
         $container(
           style({ padding: '20px' })
         )(
           // Component UI
         ),
         { onChange: changeTether() }
       ]
     })
   ```

2. Export from `/home/user/aelea/aelea/src/ui-components/index.ts`
   ```typescript
   export { $MyComponent } from './components/$MyComponent.js'
   export type { IMyComponent } from './components/$MyComponent.js'
   ```

3. Add example to website (`/home/user/aelea/website/src/pages/examples/`)

### Updating Package Version

```bash
# Create changeset
npx changeset
# Select packages to bump
# Choose version bump type (major/minor/patch)
# Describe changes

# Update version in package.json
bun run changeset:version

# Commit changes
git add .
git commit -m "chore: version bump"

# Publish (CI/CD handles this on master)
bun run changeset:publish
```

### Adding a New Example

1. Create directory in `/home/user/aelea/website/src/pages/examples/`
   ```
   my-example/
   ├── $MyExample.ts         # Component implementation
   ├── readme.ts             # Description text
   └── code.ts               # Source code as string for Monaco
   ```

2. Export from `/home/user/aelea/website/src/pages/examples/index.ts`

3. Add to examples list in `/home/user/aelea/website/src/pages/examples/$Examples.ts`

### Debugging Stream Issues

**Common issues:**

1. **Stream not updating:**
   - Check if stream is actually running (`run()` called)
   - Verify scheduler is executing tasks
   - Check for errors in sink.error()

2. **Memory leaks:**
   - Ensure disposables are disposed
   - Check for circular references in streams
   - Use SettableDisposable for dynamic subscriptions

3. **Performance issues:**
   - Check if expensive operations are multicast
   - Verify map fusion is working
   - Profile with browser DevTools

**Debugging utilities:**
```typescript
import { tap } from 'aelea/stream'

// Log stream values
const debugStream$ = tap(
  value => console.log('Stream value:', value),
  originalStream$
)
```

---

## Important Constraints

### Build & Compilation

1. **TypeScript strict mode** - All code must pass strict type checking
2. **ESM only** - No CommonJS support
3. **.js extensions required** - Import statements must include `.js` extension
4. **Incremental builds** - TypeScript uses composite/incremental compilation
5. **Build before test** - Run `bun run aelea:build` before testing changes

### Code Quality

1. **Biome linting** - All code must pass `bun run biome:check`
2. **Type exports** - Use `export type` for type-only exports
3. **Const assertions** - Use `const` where possible (enforced by Biome)
4. **Import types** - Use `import type` for type-only imports
5. **No explicit any** - Avoid explicit `any`, use generics instead (Biome warning)

### Git & CI/CD

1. **Branch naming** - Feature branches must start with `claude/` for CI
2. **Commit messages** - Follow conventional commits format
3. **No direct master push** - All changes via pull requests
4. **Linting in CI** - CI fails if Biome checks don't pass
5. **Build in CI** - CI fails if build fails

### Runtime Constraints

1. **Browser support** - Modern browsers only (ES2023 features)
2. **No polyfills** - Assumes native Promise, Symbol.dispose, etc.
3. **ESM modules** - Import/export syntax required
4. **Scheduler required** - All streams need scheduler to run
5. **Disposal required** - Resources must be disposed to prevent leaks

### API Stability

1. **Published surface** - Only `dist/` is published to npm
2. **Type compatibility** - Public types must remain backward compatible
3. **Deprecation process** - Use @deprecated JSDoc for removed features
4. **Semantic versioning** - Follow semver for releases
5. **Changesets required** - All changes need changeset entries

### Performance Requirements

1. **Map fusion** - Don't break map fusion optimization
2. **Lazy evaluation** - Maintain lazy stream semantics
3. **Minimal allocations** - Avoid unnecessary object creation in hot paths
4. **Scheduler batching** - Use scheduler for batched updates
5. **Benchmark regression** - Don't regress benchmark performance

---

## Additional Resources

### Key Documentation Files

- `/home/user/aelea/README.md` - Main project documentation (352 lines)
- `/home/user/aelea/GEMINI.md` - AI assistant overview
- `/home/user/aelea/aelea/src/stream/README.md` - Stream library docs
- `/home/user/aelea/aelea/src/stream-extended/README.md` - Extended stream docs

### External Resources

- **TypeScript:** https://www.typescriptlang.org/docs/
- **Biome:** https://biomejs.dev/
- **Bun:** https://bun.sh/docs
- **Changesets:** https://github.com/changesets/changesets

### Similar Projects (for context)

- **@most/core** - Monadic streams library (benchmarked against)
- **RxJS** - Reactive Extensions for JavaScript
- **Callbag** - Lightweight observable/iterable library

---

## Workflow Checklist

### Before Making Changes

- [ ] Understand the module you're modifying
- [ ] Read existing code in that module
- [ ] Check if similar functionality exists
- [ ] Review related documentation

### During Development

- [ ] Follow naming conventions ($ prefix, etc.)
- [ ] Use TypeScript strict types
- [ ] Curry functions with curry2/curry3/curry4
- [ ] Add proper type exports
- [ ] Handle disposal properly
- [ ] Consider performance implications

### Before Committing

- [ ] Run `bun run biome:check:fix`
- [ ] Run `bun run build` (verify build succeeds)
- [ ] Test changes in website examples
- [ ] Update relevant documentation
- [ ] Create changeset if needed (`npx changeset`)

### For Pull Requests

- [ ] Descriptive commit messages
- [ ] Changes described in changeset
- [ ] Examples added/updated if needed
- [ ] No console warnings or errors
- [ ] Branch name follows convention

---

## Quick Reference

### Most Common Imports

```typescript
// Streams
import { map, filter, merge, combine, switchLatest } from 'aelea/stream'
import { now, periodic, fromPromise } from 'aelea/stream'

// Extended
import { behavior, state, multicast } from 'aelea/stream-extended'
import type { IBehavior } from 'aelea/stream-extended'

// UI
import { $element, $text, component, style, attr } from 'aelea/ui'
import { nodeEvent, runBrowser } from 'aelea/ui'

// Components
import { $row, $column, $Button, $TextField } from 'aelea/ui-components'
import { layoutSheet, designSheet } from 'aelea/ui-components'

// Router
import { create, match } from 'aelea/router'
```

### File Path Reference

```
Library source:     /home/user/aelea/aelea/src/
Library build:      /home/user/aelea/aelea/dist/
Website source:     /home/user/aelea/website/src/
Website build:      /home/user/aelea/website/dist/
Config files:       /home/user/aelea/
Benchmarks:         /home/user/aelea/aelea/benchmark/
Examples:           /home/user/aelea/website/src/pages/examples/
```

---

**Last Updated:** 2025-11-15
**Document Version:** 1.0
**Library Version:** 2.5.31

For questions or clarifications, refer to existing code examples in the repository or the comprehensive README.md file.
