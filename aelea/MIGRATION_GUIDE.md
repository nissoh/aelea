# @most to @aelea/stream Migration Guide

## Type Mappings

| @most/types | @aelea/stream |
|-------------|---------------|
| `Stream<T>` | `IStream<T, S>` |
| `Sink<T>` | `Sink<T>` (no time parameter) |
| `Scheduler` | `Scheduler` or generic `S` |
| `Disposable` | `Disposable` |
| `Time` | Not used - no time parameters |

## Available Function Mappings

| @most/core | @aelea/stream | Notes |
|------------|---------------|-------|
| `at(time, value)` | `at(time, value)` | |
| `chain(f, stream)` | `chain(f)(stream)` | Curried |
| `combine(f, streams)` | `combine(streams, initial)` | Different API |
| `constant(value, stream)` | `constant(value)(stream)` | In compat.ts |
| `continueWith(f, stream)` | `continueWith(f)(stream)` | Curried |
| `debounce(delay, stream)` | `debounce(delay)(stream)` | Curried |
| `empty` | `empty` | |
| `filter(pred, stream)` | `filter(pred)(stream)` | Curried |
| `fromPromise(promise)` | `fromPromise(promise)` | |
| `map(f, stream)` | `map(f)(stream)` | Curried |
| `merge(...streams)` | `merge(...streams)` | |
| `multicast(stream)` | `multicast(stream)` | |
| `never` | `never` | |
| `now(value)` | `now(value)` | |
| `periodic(period, value)` | `periodic(period, value)` | |
| `run(sink, scheduler, stream)` | `stream(scheduler, sink)` | Direct call |
| `runEffects(stream, scheduler)` | `runPromise(scheduler)(stream)` | |
| `scan(f, init, stream)` | `scan(f, init)(stream)` | Curried |
| `skipRepeats(stream)` | `skipRepeats(stream)` | |
| `skipRepeatsWith(eq, stream)` | `skipRepeatsWith(eq)(stream)` | Curried |
| `startWith(value, stream)` | `startWith(value, stream)` | In compat.ts |
| `switchLatest(stream)` | `lswitch(stream)` or `switchLatest(stream)` | Alias in compat.ts |
| `take(n, stream)` | `take(n)(stream)` | Curried |
| `tap(f, stream)` | `tap(f)(stream)` | Curried |
| `until(endSignal, stream)` | `until(endSignal)(stream)` | Curried |

## Recently Implemented Combinators

The following combinators have been added to support migration:

| Function | Description | Usage |
|----------|-------------|-------|
| `chain(f)(stream)` | FlatMap/bind operation | Maps values to streams and switches |
| `debounce(delay)(stream)` | Debounce stream events | Delays events until quiet period |
| `skipRepeats(stream)` | Skip consecutive duplicates | Uses === equality |
| `skipRepeatsWith(eq)(stream)` | Skip repeats with custom equality | Custom equality function |
| `take(n)(stream)` | Take first n events | Limits stream to n events |
| `until(endSignal)(stream)` | End stream on signal | Ends when signal emits |

## Still Missing Combinators

The following @most/core functions are not yet implemented:

| Function | Description | Workaround |
|----------|-------------|------------|
| `awaitPromises(stream)` | Await promises in stream | Use `chain` with `fromPromise` |
| `combineArray(f, arrayOfStreams)` | Combine array of streams | Use `combine` with array |
| `join(streamOfStreams)` | Flatten nested streams | Use `lswitch` |
| `mergeArray(arrayOfStreams)` | Merge array of streams | Use `merge(...array)` |
| `propagateTask(value, sink, scheduler)` | Low-level task propagation | Not needed in high-level API |
| `sample(sampler, values)` | Sample values stream | Implement custom |
| `snapshot(f, values, sampler)` | Snapshot values at sample times | Implement custom |
| `zip(f, stream1, stream2)` | Zip two streams | Implement custom |
| `zipArray(f, arrayOfStreams)` | Zip array of streams | Implement custom |

## Key Differences

1. **Curried API**: @aelea/stream uses curried functions for operators
2. **No Time Parameter**: Sinks don't have time parameter in methods
3. **Generic Scheduler**: Scheduler type is generic parameter `S`
4. **Direct Function Call**: Streams are functions, called directly
5. **IOps Type**: Need to update to use `IStream<I, S>` instead of `Stream<I>`

## Migration Steps

1. Replace imports
2. Update type annotations (add scheduler type parameter)
3. Convert operator calls to curried form
4. Update sink implementations (remove time parameter)
5. Replace `run` with direct stream invocation
6. Check MIGRATION_GUIDE.md for missing combinators and implement workarounds

## Import Changes

```typescript
// Before
import { map, filter, scan } from '@most/core'
import { newDefaultScheduler } from '@most/scheduler'
import type { Stream } from '@most/types'

// After
import { map, filter, scan, defaultEnv } from 'aelea/stream'
import type { IStream, Scheduler } from 'aelea/stream'
```

## Code Pattern Changes

```typescript
// Before - @most/core
const result = scan(add, 0, map(x => x * 2, filter(x => x > 0, source)))

// After - @aelea/stream
const result = op(
  source,
  filter(x => x > 0),
  map(x => x * 2),
  scan(add, 0)
)
```