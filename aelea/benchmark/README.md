# aelea benchmarks

Performance benchmarks comparing aelea's stream primitives against
[`@most/core`](https://github.com/mostjs/core), plus internal A/B suites
(scheduler before/after) and headless renderer smoke tests.

## Layout

```
benchmark/
├── run.ts              # entry — runs all suites, prints unified report
├── lib/
│   ├── runtime.ts      # shared scheduler + sink for both libs
│   ├── suite.ts        # ISuite type + runner
│   └── report.ts       # grouped table renderer with delta vs baseline
├── suites/             # individual benchmarks
│   ├── map-filter-reduce.ts
│   ├── scan.ts
│   ├── switch.ts
│   ├── switch-latest.ts
│   ├── combinators.ts
│   └── scheduler.ts
└── render/             # headless renderer artifacts (not benchmarks)
    ├── og-takumi.ts
    └── headless-render.ts
```

## Run

```bash
bun run bench                  # all suites, default time budget
bun run bench:quick            # halved time budget per suite
bun run bench:combinators      # one suite (also: scan, switch, switch-latest, scheduler, map-filter-reduce)

# filter by partial title match:
bun run benchmark/run.ts switch combinators
```

Each task runs for `time` ms (default 500) after a `warmupTime` ms warmup
(default 250). Tinybench picks the iteration count to fit the budget.

Render artifacts:

```bash
bun run render:og          # → benchmark/render/og-takumi.webp
bun run render:headless    # → benchmark/render/headless-render.webp
```

## Authoring a new suite

```ts
// benchmark/suites/my-suite.ts
import { type ISuite, runAndPrint } from '../lib/suite.js'

const suite: ISuite = {
  title: 'my suite',
  subtitle: 'optional context line',
  options: { time: 500, warmupTime: 250 },
  tasks: [
    { group: 'scenario A', variant: '@most/core', baseline: true, fn: () => /* ... */ },
    { group: 'scenario A', variant: '@aelea',                      fn: () => /* ... */ },
    { group: 'scenario B', variant: '@most/core', baseline: true, fn: () => /* ... */ },
    { group: 'scenario B', variant: '@aelea',                      fn: () => /* ... */ }
  ]
}

export default suite

if (import.meta.main) await runAndPrint(suite)
```

Then add the import to `run.ts`. The reporter automatically:
- groups rows by `group`
- picks the right time unit (ns / µs / ms) per group
- computes `delta` ratio against the row marked `baseline: true` (or first row if none)
- highlights faster (▲) / slower (▼) / parity (◇) outcomes

## Notes

- Benches run on Bun. The scheduler suite pins both AFTER and BEFORE schedulers
  to a queueMicrotask path so we measure flush-loop differences, not host
  microtask vs setImmediate.
- Results are ops/throughput driven; deltas are computed from
  `throughput.mean`, not latency, so they're directly readable as "× faster".
- `rsd` (relative standard deviation, %) under ~2% indicates a stable run.
  Higher noise usually means the workload is too short or the host is busy.
