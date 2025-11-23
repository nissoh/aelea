# Aelea — Composable Reactive UI

Aelea is a stream-first UI toolkit for the DOM. Components are plain functions: streams go in, DOM comes out, and child components emit new streams back to parents. No virtual DOM and no hidden state.

> Who this is for: teams who like explicit dataflow and DOM-only rendering, and contributors exploring the stream/router/ui internals.  
> What you get: a stream-first UI kit—DOM factories, stream operators, and components with no VDOM or hidden state.  
> LLM benefit: generates imperative DOM code instead of XML-like markup, so assistants emit stable code paths rather than token-by-token diffed templates. The counter example below is ~100 tokens (~400 chars), small enough to slot into prompts.

## If you know React

- Replace `useState`/props with streams flowing down and change streams flowing up.
- No JSX: DOM comes from `$element`, `$text`, and component composition.
- Effects/derived state are stream operators (`map`, `merge`, `switchMap`) instead of hooks.
- Parents own state; children are pure and only emit changes.

## Mental model: inputs down, outputs up

- Components are called twice: `$Comp(inputs)({ outputs })` — first call supplies streams in, second wires emitted streams out.
- Tethers connect child output streams to parent reducers; they keep components pure.
- DOM is produced directly from streams; `map`/`switchMap` swap and derive subtrees without a VDOM.

## Quick start: counter without a VDOM

```ts
import type { IBehavior } from 'aelea/stream-extended'
import type { INode } from 'aelea/ui'
import { map, merge, reduce } from 'aelea/stream'
import { $element, $text, component, nodeEvent, render, style } from 'aelea/ui'

const row = style({ display: 'flex', alignItems: 'center', gap: '8px' })

const $Button = (label, tether) =>
  $element('button')(
    style({
      padding: '6px 10px',
      border: '1px solid #d0d7de',
      borderRadius: '6px',
      background: '#f6f8fa',
      cursor: 'pointer'
    }),
    tether(nodeEvent('click'))
  )($text(label))

// Child: renders DOM from the current count stream and emits +1 / -1
const $Counter = (count$) =>
  component((
    [increment, incTether]: IBehavior<INode, MouseEvent>,
    [decrement, decTether]: IBehavior<INode, MouseEvent>
  ) => [
    $element('div')(row)(
      $Button('-', decTether),
      $text(map(n => `Count: ${n}`, count$)),
      $Button('+', incTether)
    ),
    {
      countChange: merge(
        map(() => -1, decrement),
        map(() => 1, increment)
      )
    }
  ])

// Parent: owns state, wires child output back into the reducer
const $App = component((
  [countChange, countChangeTether]: IBehavior<number>
) => {
  const count$ = reduce((acc, delta) => acc + delta, 0, countChange)

  return [
    $Counter(count$)({ countChange: countChangeTether }),
    {}
  ]
})

render({
  rootAttachment: document.body,
  $rootNode: $App({})
})
```

How it reads:
- Components are curried: first call supplies inputs (`count$`), second call wires outputs (`countChange`).
- Tethers (`countChangeTether`) connect child output streams to the parent reducer.
- Surface is small and tree-shakeable—import only what you need.

## Grow it: count counters

Add/remove counters and keep a running total. Parent still owns all state; children only emit deltas.

```ts
import type { IBehavior } from 'aelea/stream-extended'
import type { INode } from 'aelea/ui'
import { map, merge, reduce, switchMap } from 'aelea/stream'
import { $element, $text, component, nodeEvent, render, style } from 'aelea/ui'

const row = style({ display: 'flex', alignItems: 'center', gap: '8px' })
const column = style({ display: 'flex', flexDirection: 'column', gap: '12px' })
const wrap = style({ display: 'flex', flexWrap: 'wrap', gap: '8px' })

const $Button = (label, tether) =>
  $element('button')(
    style({
      padding: '6px 10px',
      border: '1px solid #d0d7de',
      borderRadius: '6px',
      background: '#f6f8fa',
      cursor: 'pointer'
    }),
    tether(nodeEvent('click'))
  )($text(label))

const $Counter = (label, count$) =>
  component((
    [increment, incTether]: IBehavior<INode, MouseEvent>,
    [decrement, decTether]: IBehavior<INode, MouseEvent>
  ) => [
    $element('div')(row)(
      $text(label),
      $Button('-', decTether),
      $text(map(String, count$)),
      $Button('+', incTether)
    ),
    {
      change: merge(map(() => -1, decrement), map(() => 1, increment))
    }
  ])

const $CountCounters = component((
  [addClick, addTether]: IBehavior<INode, MouseEvent>,
  [change, changeTether]: IBehavior<{ index: number; delta: number }>
) => {
  const counters$ = reduce(
    (list, event) => {
      if (event.type === 'add') return [...list, 0]
      const next = [...list]
      next[event.index] = next[event.index] + event.delta
      return next
    },
    [],
    merge(
      map(() => ({ type: 'add' as const }), addClick),
      map(({ index, delta }) => ({ type: 'change' as const, index, delta }), change)
    )
  )

  const total$ = map(list => list.reduce((sum, n) => sum + n, 0), counters$)

  return [
    $element('div')(column)(
      $element('div')(row)(
        $Button('Add counter', addTether),
        $text(map(list => `Count: ${list.length} | Total: ${list.reduce((sum, n) => sum + n, 0)}`, counters$))
      ),
      switchMap(list =>
        $element('div')(wrap)(
          ...list.map((_, index) =>
            $Counter(`Counter ${index + 1}`, map(xs => xs[index] ?? 0, counters$))({
              change: changeTether(map(delta => ({ index, delta })))
            })
          )
        ),
        counters$
      ),
      $text(map(total => `Overall total: ${total}`, total$))
    ),
    {}
  ]
})

render({
  rootAttachment: document.body,
  $rootNode: $CountCounters({})
})
```

## Run the demos

- Start the docs/examples dev server: `cd website && bun run dev` (Vite on http://localhost:5173 by default).
- Drop snippets into the website workspace (e.g., `website/src/pages/examples`) to try variations, or render into any DOM root with `render({ rootAttachment, $rootNode })`.

## Common patterns

- Parent owns state; children emit change streams. Wire them with tethers rather than shared mutable state.
- Lists: use an add/update/remove reducer; see `website/src/pages/examples/count-counters/$CountCounters.ts`.
- Derived DOM: `map` for simple projections, `switchMap` for swapping subtrees, `joinMap`/`until` for mount/unmount lifecycles; see `website/src/pages/examples/toast-queue/$ToastQueue.ts`.

## Learn more

- Browse the demos in `website/src/pages/examples` for list management, routing, animation, and themeable UI.
- Check `aelea/src` for the stream, router, and UI primitives.
- Licensed MIT.
