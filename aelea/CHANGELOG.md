# aelea

## 3.0.0

### Major Changes

- b1eda3e: Major release. Substantial breaking changes across router, scheduler, and renderer surface.

  ## Router (breaking)

  - Removed `aelea/router`. Replaced by `aelea/ui-router` with a declarative schema-based API.
  - New entry point: `createRouteSchema(spec)` builds a typed `RouteNode` tree. `Route.create`/`match`/`contains` fields are gone — `Route` is now `{ fragment, fragments }`.
  - Reactive status is read via `isContaining(route)`, the `match(route)(stream)` mounting op, and the `contains(route)(stream)` mounting op.
  - New `href(node, params?)` derives URLs from the schema; consumers no longer pass `url:` to anchors.
  - `$RouterAnchor` renamed to `$Link`. `IAnchor` now `{ route, params?, $anchor? }`. `$defaultAnchor` styled with hover/focus pseudos and `text-decoration: none`.
  - `$Link`'s `click` output is `IBehavior<INode<HTMLAnchorElement>, string>` (destination URL); enable navigation by tethering it (e.g. `({ click: op })`).

  ## Scheduler (mostly internal, behaviour edge)

  - `Browser`/`NodeScheduler` flush asap-tasks with one shared timestamp per flush (was per-task `performance.now()`); same-tick tasks now agree on `time()`.
  - Recycled asap task array + single-task fast path. Burst workloads (~100 just-subscribes / `at(0)` storms) ~20% faster; trivial pipelines ~10% faster.
  - `BrowserScheduler` no longer carries the `asapCancelled` defensive flag (HTML spec guarantees microtasks drain before timers).

  ## Stream-extended

  - `recover(config, source)` — re-subscribe-after-end with a minimum interval. New combinator.
  - `promiseState`: `PromiseStateError.error` widened from `Error` to `unknown`; rejections pass through unchanged (no more `String(payload)` wrapping). Sink dispose now wired into the disposable chain. Internal `AbortController` removed (was dead code).

  ## Tests

  - New test suite under `aelea/test/` (31 cases): core combinator behavior, `promiseState` semantics, `recover` timing & curry, scheduler dispose paths.
  - `bun test` script available in the package.

  ## Removed peer-dep noise

  - Dropped unused `@resvg/resvg-js`, `@takumi-rs/image-response`, `@types/react`, `react` from `aelea` devDeps.
