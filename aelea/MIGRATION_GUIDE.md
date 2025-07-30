# @most to @aelea/stream Migration Guide

## Type Mappings

| @most/types | @aelea/stream |
|-------------|---------------|
| `Stream<T>` | `IStream<T, S>` |
| `Sink<T>` | `Sink<T>` (no time parameter) |
| `Scheduler` | `Scheduler` or generic `S` |
| `Disposable` | `Disposable` |

## Function Mappings

| @most/core | @aelea/stream | Notes |
|------------|---------------|-------|
| `empty()` | `empty` | |
| `never()` | `never` | |
| `now(value)` | `now(value)` | |
| `constant(value, stream)` | Use `map(() => value)(stream)` | |
| `startWith(value, stream)` | `merge(now(value), stream)` | |
| `filter(pred, stream)` | `filter(pred)(stream)` | Curried |
| `map(f, stream)` | `map(f)(stream)` | Curried |
| `tap(f, stream)` | `tap(f)(stream)` | Curried |
| `scan(f, init, stream)` | `scan(f, init)(stream)` | Curried |
| `merge(...streams)` | `merge(...streams)` | |
| `combine(f, streams)` | `combine(streams, initial)` | Different API |
| `multicast(stream)` | `multicast(stream)` | |
| `switchLatest(stream)` | `lswitch(stream)` | |
| `chain(f, stream)` | Use `map` then `lswitch` | |
| `run(sink, scheduler, stream)` | `stream(scheduler, sink)` | Direct call |
| `runEffects(stream, scheduler)` | `runPromise(scheduler)(stream)` | |

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