# Aelea Performance Benchmark Report

## Latest Benchmark Results (2025-01-03)

### Performance Results

#### Map-Filter-Reduce (1M elements)
- **@most/core**: 4.45ms avg (241 ops/s)
- **@aelea**: 3.80ms avg (265 ops/s)
- **Result**: aelea is **10% faster** ✨

#### Reduce/Scan (1M elements)
- **@most/core scan**: 1.97ms avg (512 ops/s)
- **@aelea reduce**: 1.59ms avg (628 ops/s)
- **Result**: aelea is **23% faster** ✨

#### Switch (1000x1000)
- **@most/core**: 181.9μs avg (5,620 ops/s)
- **@aelea**: 39.3μs avg (26,247 ops/s)
- **Result**: aelea is **4.6x faster** 🚀

#### Combinators Performance (100 items per stream)
| Combinator | Scenario | @most/core (ops/s) | @aelea (ops/s) | Performance |
|------------|----------|-------------------|----------------|-------------|
| **Merge** | 2 streams | 857,841 | 539,524 | -37% |
| **Merge** | 5 streams | 414,374 | 285,591 | -31% |
| **Combine** | 2 streams | 571,657 | 263,491 | -54% |
| **Combine** | 3 streams | 434,320 | 218,032 | -50% |
| **Zip** | 2 streams | 239,724 | 196,342 | -18% |
| **Zip** | 3 streams | 203,263 | 157,560 | -22% |

## Environment

- **Runtime**: Bun 
- **Scheduler**: Environment-aware scheduler with automatic optimization
  - **Browser**: Uses native `queueMicrotask` for smooth UI updates
  - **Node.js**: Uses `setImmediate` for better I/O performance
  - **DomScheduler**: Specialized scheduler with paint phase for DOM operations
  - Auto-detects environment and selects optimal implementation

