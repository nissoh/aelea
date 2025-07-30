# Stream Benchmark Results

## Performance Comparison

### Map-Filter-Reduce (1,000,000 operations)
```
┌─────────────────────────────────┬──────────────────┬────────────────────────┐
│ Library                         │ Throughput (ops/s)│ Relative Performance   │
├─────────────────────────────────┼──────────────────┼────────────────────────┤
│ @most/core                      │ 278              │ 1.00x                  │
│ aelea/stream                    │ 81               │ 0.29x                  │
└─────────────────────────────────┴──────────────────┴────────────────────────┘
```

### Scan (1,000,000 operations)
```
┌─────────────────────────────────┬──────────────────┬────────────────────────┐
│ Library                         │ Throughput (ops/s)│ Relative Performance   │
├─────────────────────────────────┼──────────────────┼────────────────────────┤
│ @most/core                      │ 528              │ 1.00x                  │
│ aelea/stream                    │ 84               │ 0.16x                  │
└─────────────────────────────────┴──────────────────┴────────────────────────┘
```

### Switch (1,000 streams × 1,000 elements)
```
┌─────────────────────────────────┬──────────────────┬────────────────────────┐
│ Library                         │ Throughput (ops/s)│ Relative Performance   │
├─────────────────────────────────┼──────────────────┼────────────────────────┤
│ @most/core                      │ 4,455            │ 1.00x                  │
│ aelea/stream                    │ 13,016           │ 2.92x                  │
└─────────────────────────────────┴──────────────────┴────────────────────────┘
```

## API Comparison

### @most/core
```typescript
import { map, filter, scan, switchLatest, runEffects } from '@most/core'
import { newDefaultScheduler } from '@most/scheduler'

const s = pipe(
  source,
  map(x => x * 2),
  filter(x => x > 10),
  scan((acc, x) => acc + x, 0)
)

runEffects(s, newDefaultScheduler())
```

### aelea/stream
```typescript
import { map, filter, scan, lswitch, runStream, op } from '@aelea/stream'

const s = op(
  source,
  map(x => x * 2),
  filter(x => x > 10),
  scan((acc, x) => acc + x, 0)
)

runStream(scheduler, sink)(s)
```

Key differences:
- Simplified implementation: `IStream<T, S>` is just a function type with scheduler parameter
- Direct function composition without wrapper abstractions
- Environment-based scheduling with flexible scheduler interface
- Exceptional switch performance (2.92x faster than @most/core)
- Trade-off: Lower performance on map-filter-reduce operations

## Recent Improvements

### Type System Enhancements
- Added generic scheduler type parameter: `IStream<T, S = Scheduler>`
- All combinators now properly propagate the scheduler type
- Improved type safety across the entire stream pipeline

### Map Fusion Exploration
- Investigated map fusion optimization for consecutive map operations
- Simplified implementation focused on clarity over performance
- Future optimization opportunities remain available