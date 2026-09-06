# Aelea DOM Renderer

Maps a tree of node streams into live DOM whose lifetime is tied to stream disposal. No virtual DOM, no diffing: a child mounts when its stream emits and unmounts when that subscription is disposed.

## Two layers, one walk

`src/ui/` is renderer-agnostic: factories, decorators, the component contract, and `backend.ts`, which holds the **mount walk**. The walk is the single traversal of a node: create the element, apply static style and attributes, subscribe every reactive channel, run effects, and mount each segment. It knows nothing about the DOM; it asks an `IMountBackend` for elements, text nodes, sinks and insertion.

`src/ui-renderer-dom/` supplies the browser backend and `render()`. `src/ui-renderer-takumi/` supplies an observer backend over plain records and rasterizes the result. Both renderers therefore share slot semantics, segment ordering, teardown, and reactive-channel semantics by construction; the parity tests only confirm it.

## Recipe and instance

A compose expression such as `$element('div')(style(…), attr(…))(children)` fixes a **recipe**: the element descriptor, static styles, static attributes, the reactive channel streams, effects, and the child segment streams. The recipe is built once and shared.

Subscribing the compose result creates an **instance** per subscription: `{ kind: 'node', recipe, mount, disposable }`. `mount` is a `MountPort` that resolves to the element the renderer materializes; `onMounted(port)` exposes it as a stream, and `nodeEvent` and the element observers go through it. `disposable` is set by the renderer to the mounted entry, so disposing the subscription (a `switchLatest` swap, an `until`, an outer teardown) removes the child.

An op-free compose result is also branded with its recipe, and a direct child with that brand mounts inline in the parent's pass with no subscription and no scheduled emission. Text children are branded with their source, string or stream, and mount the same way. Static children flatten into the parent: their bindings join the parent's disposable list and their elements go with the parent's, so only dynamic segments carry slot bookkeeping.

## Slots

A **slot** is one segment of a node, or the render root. A slot holds a set of live children in emission order. When its stream emits a node or text, the child mounts and is appended; when it emits `null`, every child in the slot unmounts; when the stream ends, the children stay until outer disposal. Replacement is disposal: a `switchLatest` over node streams disposes the previous inner, which fires its `disposable`, which removes its entry.

Segments keep declaration order regardless of emission timing: an insert into a segment below the highest mounted segment lands before the first node of the next mounted segment.

A manifest that reaches two slots (a `state`-wrapped node stream replayed into two places) mounts twice with two elements; the second `disposable.set` is reported once per manifest through `onError`, because only the first entry can be removed by that subscription.

## Channels

| Channel | Decorator | Semantics |
|---|---|---|
| static style | `style`, `stylePseudo` | one cached class per distinct declaration set, minted into a shared stylesheet |
| static attributes | `attr` | applied once at mount |
| reactive style | `styleBehavior` | the stream **owns the keys of its latest emission**: keys missing from the next emission are removed, `null` removes them all, unchanged values are not rewritten. The previous emission is the record of ownership, so emitted objects are treated as immutable. One decorator per source. |
| reactive attributes | `attrBehavior` | the same ownership rule |
| property | `effectProp` | `element[key] = value` per emission |
| effect | `effectRun` | runs once with the element after mount; a returned disposable runs on unmount |
| text | `$text(stream)` | one persistent text node updated in place |

The DOM backend coalesces every reactive write per frame: each binding keeps the latest value, a single committer flushes the whole frame's writes in one paint task, and each apply is guarded so one bad value neither kills its channel nor starves the others. `render({ devtool: true })` exposes the commit journal and live binding registry.

## Teardown

Disposing a slot entry disposes its subtree first, so bindings and effect cleanups still see an attached element, then detaches the root element once; descendants inside a subtree being discarded skip their own `removeChild`.

## Schedulers

All schedulers share one core (`stream/scheduler/core.ts`): a guarded asap queue, asap-before-delay ordering, and `idle()`, which resolves once no batch, timer or paint is outstanding.

- `createDomScheduler()`: asap on the microtask queue for compute, DOM reads and tree creation; `paint` on `requestAnimationFrame` for writes, with same-frame cascade draining bounded per frame.
- `createHeadlessScheduler()`: paint falls through to asap; used by takumi.
- `createSyncScheduler()`: asap and paint run inline; a mount is complete when `render` returns. For tests and benchmarks.

## Custom renderers

Implement `IMountBackend<Element, Text>` and call `mountRoot(new MountContext(backend), $root, host, insert)`. The takumi observer in `ui-renderer-takumi/snapshot.ts` is the smallest example.
