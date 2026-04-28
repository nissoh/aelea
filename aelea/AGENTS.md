# Aelea — Agent Guide

Aelea is a reactive/functional UI library: components are pure functions wiring streams to a DOM tree. This guide is for AI agents working in the library or in apps that consume it.

## Package Layout

- `src/stream` — core stream primitives (combinators, scheduler, sources, sinks).
- `src/stream-extended` — multicast, behavior, state, tether, promise helpers.
- `src/ui` — node/element factories, event helpers, the renderer interface.
- `src/ui-components` — reusable atoms (`$Button`, `$Table`, layout helpers, form fields).
- `src/ui-components-theme` / `-browser` — palette + theme loader.
- `src/ui-renderer-dom` — DOM renderer; `src/ui-renderer-takumi` — server-side image renderer.
- `src/router` — stream-based router.
- `dist/` — generated ESM + d.ts. Never edit; produced by `bun run build`.
- `benchmark/` — perf harnesses (`bun run bench:combinators` etc.).

## Mental Model

Components are pure functions that wire streams. Inputs are streams (or values); outputs are streams. No internal mutable state, no side effects in the body — only stream composition and a returned DOM tree.

```
parent state ──► derive prop ──► child receives stream
     ▲                                    │
     └── upsert ◄── tether ◄── child emits change
```

## Component Shape

Components are curried: `$Component(config)({ outputs })`.

```ts
export const $Component = (config: IConfig) =>
  component(
    (
      [click, clickTether]: IBehavior<PointerEvent>,
      [submit, submitTether]: IBehavior<PointerEvent, Payload>
    ) => {
      const derived = op(config.input, map(x => transform(x)))

      return [
        $column(spacing.default)(
          $element('button')(
            style({ color: pallete.message }),
            clickTether(nodeEvent('click'))
          )($text('Save'))
        ),
        { click, submit }
      ]
    }
  )
```

## DOM Composition

Element factories return `INodeCompose`; decorators compose onto them by call. Decorators stack in any order — order is irrelevant for `style`/`attr`, meaningful only for behaviors that observe other decorators.

| Factory | Use |
|---|---|
| `$element(tag)` / `$svg(tag)` | typed HTML / SVG element |
| `$node` | `<div>` shorthand |
| `$custom(tag)` | custom element / web component |
| `$text(value \| stream)` | text node, reactive when given a stream |
| `$wrapNativeElement(el)` | adopt an existing DOM node |

| Decorator | Use |
|---|---|
| `style({...})` / `styleInline({...})` | static styles (class-hashed vs inline) |
| `styleBehavior(stream<style>)` | reactive style; emit `null` to unset |
| `stylePseudo(':hover', {...})` | pseudo-selector styles |
| `attr({...})` / `attrBehavior(stream)` | static / reactive attributes |
| `nodeEvent('click')` paired with a tether | event source from the element |
| `motion(config, target$)` | spring-interpolated value stream |

```ts
$element('button')(
  style({ padding: '8px 12px' }),
  stylePseudo(':hover', { background: pallete.foreground }),
  styleBehavior(map(d => d ? { opacity: 0.5 } : null, isDisabled)),
  attrBehavior(map(d => ({ disabled: d ? '' : null }), isDisabled)),
  clickTether(nodeEvent('click'))
)($text('Save'))
```

## Behaviors: the Input/Output Contract

`IBehavior<TIn, TOut>` is a tuple `[stream, tether]`:
- `stream: IStream<TOut>` — receives transformed values.
- `tether: (...ops) => handler` — connects an event source through transforms into the stream.

```ts
[click, clickTether]: IBehavior<PointerEvent>          // TIn = TOut
[submit, submitTether]: IBehavior<PointerEvent, Data>  // event → transform → Data

clickTether()                                          // PointerEvent flows through
submitTether(map(() => buildPayload()), awaitPromises) // chain transforms in the tether
```

## Stream Composition

Always use `op()` for stream pipelines. Left-to-right reads better than nested calls and keeps types narrow.

```ts
const result = op(
  source,
  map(x => x.value),
  filter(x => x > 0),
  switchMap(async x => fetch(x))
)
```

`op()` is for **stream operators only**. Element trees compose directly: `$row(spacing.default)($text('hi'))`.

## `combine()` vs `merge()`

These are not interchangeable.

```ts
// combine — waits for ALL sources, emits when ANY changes
const adjusted = map(
  ({ draft, balance }) => balance + draft.amount,
  combine({ draft, balance })
)

// merge — union of emissions, passes through immediately
const account = merge(changeAccount, op(connection, map(toAccount)))
```

- `combine()` — "I need a value from each of these to compute something."
- `merge()` — "Any of these can trigger this."

## `just()` vs `state()`

```ts
just(false)                       // emit once, immediate, for constants
state(stream, initial)            // cache last value for late subscribers
```

Use `state()` when:
- multiple subscribers consume the same value (avoid duplicate work),
- a value feeds `combine()` and may emit later than its peers,
- local component value must persist across re-renders inside `switchMap`.

## Cross-Component State

One pattern covers parent/child communication: **state down as a stream prop, change up through a tether, merge back into the source**. Parent owns the value; child is a pure emitter. No callbacks, no globals, survives re-renders.

```ts
// Parent
[changeAccount, changeAccountTether]: IBehavior<IAccount>

const account = merge(
  changeAccount,
  op(connection, map(toAccount), state)
)

$Child({ account })({ changeAccount: changeAccountTether() })
```

For editable models, the child emits the **next** model (not a patch). The parent upserts into its store:

```ts
const $Editor = ({ model }: { model: IStream<Model> }) =>
  component(([change, changeTether]: IBehavior<Model>) => {
    const next = sampleMap(
      ({ current, input }) => ({ ...current, value: current.value + input }),
      combine({ current: model, input: userInput }),
      userInput
    )
    return [$ui, { change: next }]
  })
```

For lists, fold structural events (`add` / `update` / `remove`) into the array with `reduce` at the owner; children receive their slice and emit changes back.

## Composable Containers

Don't accept `style` / `className` props — they collapse to one override. Instead expose the outer node:

```ts
export const $defaultButtonContainer = $element('button')(style({ padding: '8px' }))

export const $Button = ({ $container = $defaultButtonContainer }) => ...

// host
$Button({ $container: $defaultButtonContainer(style({ margin: 0 }), attr({ id: 'go' })) })
```

Decorators stack (style + attr + behavior + pseudo) without forking. Comment any load-bearing CSS on the default (e.g. `position: relative`) so overrides don't silently clobber it.

## Conditional UI

```ts
const $view = op(
  isLoading,
  map(loading => loading ? $Spinner() : $Content()),
  switchLatest
)
```

Avoid returning `empty` while loading — the row disappears and pops back, causing layout shift. Render a placeholder instead.

## Naming

| Prefix / Suffix | Use |
|---|---|
| `$Name` | UI-returning function (`$Button`, `$Counter`) |
| `$defaultXxxContainer` | exported default outer node for a component |
| `Tether` suffix | the second element of an `IBehavior` tuple |

## Coding Style

- TypeScript strict, ESNext modules, `verbatimModuleSyntax` — use `import type` for types.
- 2-space indent, ~120-char lines, single quotes.
- `.js` extension on relative imports (ESM resolution).
- Hyphenated folder/file segments stay consistent (`ui-components-theme-browser`).
- Prefer `params => params.account.address` over destructuring in `map` callbacks — avoids spurious renames during refactors.

## Build & Check

From `aelea/`:

```bash
bun run build       # clean dist + tsc -b
bun run tsc:check   # type-only
bun run bench:combinators
bun run bench:characteristics
```

There is no test runner; rely on `tsc:check` and targeted benches. Place repros next to the module or under `benchmark/`.

## Gotchas

1. **Streams created inside `switchMap` reset on re-emission.** Define persistent streams at the parent and reference them inside.
2. **`constant(0n, click)` resets synchronously.** If sampling on the same event, derive a separate stream without the reset.
3. **`combine()` will not emit until every source has fired.** If one source is async, gate it through `state(stream, initial)` or it will block the whole combine.
4. **Multicast any derived stream with more than one subscriber.** A bare `map(fn, combine(...))` reused in three places creates three independent subscriptions; without an upstream replay step, consumers can diverge (one receives an emission, another doesn't). Wrap shared derivations in `multicast`.
5. **Cache async calls with `Map<key, Promise<T>>` + `multicast`** to avoid duplicate network requests when multiple subscribers race the same input.
6. **Prefer `switchMap(async x => …)` over `switchLatest(map(fromPromise, …))`** — fewer allocations, clearer semantics, and proper cancellation on re-emission.
7. **Don't render stub values for pending async data.** Reserve the slot with a placeholder; `0` / `''` looks real and misleads users. Push the fallback into a dedicated intermediate primitive rather than `?? 0n` at the render site.
8. **Element composition is not stream composition.** `$row(...)($text(...))` composes directly; `op()` is for stream operators.

## Commits & PRs

- Imperative subjects: `Add stream throttling helper`, not `added` / `adds`.
- Keep commits focused; squash fixups.
- PR descriptions: scope, risk, user impact; list commands run (`tsc:check`, builds, benches); screenshots for UI changes.
