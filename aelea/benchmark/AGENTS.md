# Engine Iteration Guide

For an agent doing a sustained pass of perf-focused refactors against the
stream engine (`src/stream/`), the renderer (`src/ui-renderer-dom/`), or the
node/scheduler core (`src/ui/`). Read `benchmark/README.md` first for the
harness mechanics; this doc is the iteration discipline that goes on top.

## Scope

| In scope | Off limits without explicit ask |
|---|---|
| Inline hot-path closures, hoist allocations, shared scratch buffers | Public stream operator semantics, sink contract, disposable contract |
| Specialize fast paths for common arities (`combineMap × 2`, `merge × 2`) | `IStream`/`ISink`/`IScheduler` interfaces, `op()` shape |
| Reduce `paint`/`asap` task object churn | Adding new public exports during a perf pass |
| Renderer paint coalescing, applier diffing, attribute write skipping | Removing the `BEFORE`/`AFTER` scheduler split — keep both for comparison |

The sink contract has a non-obvious invariant: **`sink.error(time, value)` is
applicative, not terminal — only `sink.end(time)` ends a stream.** Don't
"optimize" by skipping `error` once an upstream has errored. (This deviates
from `most.js`/RxJS; lean on tests, not intuition.)

## The iteration loop

One refactor → one measurement → one decision → one commit. No accumulation.

1. **Pick one hot path.** A single `group` in a single suite. Examples:
   - `scheduler :: 100 just burst :: AFTER`
   - `combinators :: merge × 2 :: @aelea`
   - `map · filter · reduce :: @aelea`
2. **Capture baseline.** From `aelea/`:
   ```bash
   mkdir -p benchmark/.results
   bun run bench:<suite> 2>&1 | tee benchmark/.results/$(date +%Y-%m-%d-%H%M%S)-before.txt
   ```
   `.results/` is git-ignored scratch space — never commit these.
3. **Make the change.** One concept per refactor. If you find yourself fixing
   two things at once, split.
4. **Re-run the same suite.** Same command, write to `…-after.txt`.
5. **Read deltas.** See "What counts as a real delta" below.
6. **Cross-suite regression check.** Engine micro-opts routinely win one suite
   and regress another (specializing `merge × 2` can regress `merge × 5`;
   inlining a hot closure can grow code size enough to slow callers). **Always
   run `bun run bench:quick` end-to-end before accepting a change.** A
   per-suite local win that regresses any other group by >5% is rejected.
7. **Decide.** Accept → commit. Reject → revert. Neutral (within noise) →
   revert; don't accumulate dead weight that complicates future deltas.

## What counts as a real delta

The `delta` column in the report is `throughput.mean / baseline.mean`.

- **Below 1.03×** (3%): noise. Treat as parity. Don't ship.
- **1.03×–1.10×**: real but small. Ship only if `rsd < 2%` on both rows AND
  no other suite regresses.
- **1.10×+**: ship if `rsd` is sane. These are the wins worth stacking.
- **`rsd > 3%`** on either side: re-run with longer time budget
  (`{ time: 1000, warmupTime: 500 }`) before trusting the number. Noise above
  ~5% almost always means the workload is too short or the host is busy.

Sample count (`samples` column) below ~50 also flags an unstable run — the
suite is too short to converge.

## The BEFORE/AFTER pattern

For engine-internal refactors, the in-process A/B is more reliable than
git-stash-and-re-run. `suites/scheduler.ts` is the canonical template:

- The pre-refactor implementation is **inlined** into the suite file as a
  `class BeforeScheduler` / `function beforeOp(...)`.
- The post-refactor version is imported from `src/`.
- A shared `group` runs both back-to-back inside one tinybench instance, so
  scheduler/host noise affects both equally.

Use this pattern when the refactor is bounded enough to inline — combinator
internals, scheduler tasks, sink dispatch. Don't try to inline a renderer
diff this way; for those, snapshot stdout and compare textually.

When you eventually accept the AFTER and want to clean up: keep the
BEFORE/AFTER comparison **for one more cycle** so the next agent can see the
delta you claimed. Drop the BEFORE only when starting the next refactor on
that hot path.

## Allocations are usually the bottleneck

Before reaching for algorithmic changes, look for:

- **Per-emission closures.** A `tap(x => …)` inside a hot stream allocates
  per inner subscription. Hoist if shape-stable.
- **Per-task object literals.** `scheduler.asap({ run, error, [Symbol.dispose] })`
  on every emission — see `PropagateTask`/`makePaintWriter` for the
  pre-allocated pattern.
- **Per-iteration arrays from `Object.entries` / `Object.keys`.** In renderer
  appliers, prefer `for…in` over entries when you don't need the value type
  guarantee.
- **Map/Set construction inside hot loops.** `makeReactiveStyleApplier` keeps
  two reused Maps and swaps them — that's the shape to preserve.

The `runStream` helper in `lib/runtime.ts` reuses a **single sink instance**
across iterations. If a refactor breaks this fast path (e.g. by closing over
sink state from outside), bench numbers crater immediately. Watch for it.

## Commit conventions

One refactor, one commit. Commit message body must include:

1. The hot path targeted (suite + group + variant).
2. The before/after row from the report (raw text, no editing).
3. Any cross-suite check result (`bench:quick` end-to-end, list of touched
   groups + parity verdict).

Example body:

```
combinators :: merge × 2 :: @aelea — pre-allocate inner sinks

  variant      median µs   ops/s   rsd  samples  delta
  @most/core    9.85       102k   0.92%   600    ◆ baseline
  @aelea        7.42       135k   0.71%   600    ▲ 1.32× faster

bench:quick: no regression in scan/map-filter-reduce/scheduler/switch.
```

That's the durable record of the delta — don't write a separate log file.

## No code comments in aelea source

This package strips inline/JSDoc/block comments from `src/**`. The
*explanation* for a perf change goes in the **commit message**, never in the
code. If a refactor's "why" is non-obvious, that's exactly what makes the
commit body load-bearing — write it there.

## Pre-commit checklist

```bash
bun run tsc:check     # types
bun test              # semantic regressions
bun run biome:check   # style
bun run bench:quick   # cross-suite regression sweep
```

All four must be green. The first three are non-negotiable; `bench:quick`
catches the cross-suite regression class that local benching misses.

## Traps to skip past

1. **Don't optimize on top of a passing test that mocks the engine.** Engine
   tests in `test/core/` exercise real schedulers; trust those.
2. **`paint` ≠ `asap`.** The renderer uses `paint` to coalesce DOM writes per
   tick; the stream engine uses `asap` for synchronous-flavored propagation.
   Don't unify them.
3. **The `IElementDescriptor.native` cache** in `materializeElement` is a
   per-render memo, not a leak — leave it. Removing it doubles allocation
   pressure under `switchLatest`-driven re-renders.
4. **`fromIterable` is synchronous to completion.** A "fix" that schedules
   each emission via `asap` looks tidier and tanks throughput by 50×.
5. **`combine` and `merge` have different semantics**, and you can't
   shortcut one to the other. See `aelea/AGENTS.md` § "combine vs merge".

## Future harness improvements (don't do unprompted)

- JSON output mode for `report.ts` so deltas across saved runs can be diffed
  programmatically. Currently the agent grep-and-eyeball compares stdout
  files. Worth ~30 lines if iteration volume justifies it; ask first.
- A `bench:diff <before.json> <after.json>` script that highlights
  regressions across suites in one table.
- Memory/heap snapshot capture per suite (`--heap-snapshot`); only useful
  if a delta looks suspiciously good and the agent wants to confirm
  allocation reduction.
