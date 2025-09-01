# Aelea Performance Benchmark Report

## Latest Benchmark Results (2025-09-01)

### Performance Results

#### Map-Filter-Reduce (1M elements)
- **@most/core**: 4.33ms avg (249 ops/s)
- **@aelea**: 3.72ms avg (271 ops/s)
- **Result**: aelea is **14% faster** ✨

#### Reduce/Scan (1M elements)
- **@most/core scan**: 1.96ms avg (512 ops/s)
- **@aelea reduce**: 1.73ms avg (580 ops/s)
- **Result**: aelea is **13% faster** ✨

#### Switch (1000x1000)
- **@most/core**: 193.7ms avg (5,274 ops/s)
- **@aelea**: 21.1ms avg (50,575 ops/s)
- **Result**: aelea is **9.2x faster** 🚀

#### Combinators Performance (100 items per stream)
| Combinator | Scenario | @most/core (ops/s) | @aelea (ops/s) | Performance |
|------------|----------|-------------------|----------------|-------------|
| **Merge** | 2 streams | 842,075 | 557,665 | -34% |
| **Merge** | 5 streams | 415,837 | 300,885 | -28% |
| **Combine** | 2 streams | 571,264 | 263,530 | -54% |
| **Combine** | 3 streams | 427,148 | 211,822 | -50% |
| **Zip** | 2 streams | 233,982 | 187,028 | -20% |
| **Zip** | 3 streams | 192,566 | 150,405 | -22% |

## Environment

- **Runtime**: Bun 
- **Scheduler**: Environment-aware scheduler with automatic optimization
  - **Browser**: Uses native `queueMicrotask` for smooth UI updates
  - **Node.js**: Uses `setImmediate` for better I/O performance
  - **DomScheduler**: Specialized scheduler with paint phase for DOM operations
  - Auto-detects environment and selects optimal implementation

