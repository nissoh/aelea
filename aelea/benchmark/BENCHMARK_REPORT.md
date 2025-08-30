# Aelea Performance Benchmark Report

## Latest Benchmark Results (2025-08-30)

### Recent Optimizations Applied

#### Scheduler Improvements
- Fixed critical bug in `delay()` method - was passing incorrect arguments to `runTask`
- Eliminated closure creation in delay operations using instance arrow functions
- Applied optimizations to BrowserScheduler, NodeScheduler, and DomScheduler
- Result: No performance regression, maintained all benchmark improvements

#### Stream Implementation Refactoring
- Migrated `PeriodicTask` and `MotionSink` to extend `PropagateTask`
- Eliminated self-referential disposal issues
- Removed unnecessary disposable tracking
- Result: Cleaner code with same or better performance

### Performance Results

#### Map-Filter-Reduce (1M elements)
- **@most/core**: 4.51ms avg (239 ops/s)
- **@aelea**: 3.37ms avg (300 ops/s)
- **Result**: aelea is **25% faster** ✨

#### Reduce/Scan (1M elements)
- **@most/core scan**: 1.94ms avg (517 ops/s)
- **@aelea reduce**: 1.61ms avg (621 ops/s)
- **Result**: aelea is **20% faster** ✨

#### Switch (1000x1000)
- **@most/core**: 176.1ms avg (5,760 ops/s)
- **@aelea**: 17.2ms avg (60,625 ops/s)
- **Result**: aelea is **10.5x faster** 🚀

#### Combinators Performance (100 items per stream)
| Combinator | Scenario | @most/core (ops/s) | @aelea (ops/s) | Ratio |
|------------|----------|-------------------|----------------|-------|
| **Merge** | 2 streams | 822,723 | 477,263 | 58% |
| **Merge** | 5 streams | 419,307 | 229,203 | 55% |
| **Combine** | 2 streams | 570,789 | 259,223 | 45% |
| **Combine** | 3 streams | 436,526 | 213,132 | 49% |
| **Zip** | 2 streams | 239,736 | 117,836 | 49% |
| **Zip** | 3 streams | 197,899 | 87,987 | 44% |

## Previous Optimizations (2025)

### Stream Implementation Refactoring

1. **Migration from Factory Functions to Stream Classes**
   - Eliminated `stream` factory function overhead by implementing direct Stream classes
   - Examples: `Periodic`, `Motion`, `Component`, `At`, `MapStream`, etc.
   - Benefits: Better debugging, reduced function call overhead, more efficient instantiation

2. **PropagateTask Optimization**
   - Removed unnecessary scheduler parameter from task functions
   - Eliminated `stepTask`/`recurTask` in favor of direct PropagateTask usage
   - Result: Cleaner API and reduced memory allocations

3. **Periodic Stream Micro-optimizations**
   - Removed state object in favor of individual variables
   - Eliminated null checks by using `disposeNone`
   - Used `propagateRunTask` instead of `propagateRunEventTask` where appropriate

4. **Motion Combinator Optimization**
   - Moved `dt` constant to class level (avoid recreating each frame)
   - Created dedicated `Motion` Stream class
   - Removed method call overhead by inlining where appropriate

5. **Component Stream Class**
   - Replaced `stream` factory with dedicated `Component` class
   - Better type safety with explicit generic parameters

## Environment

- **Runtime**: Bun 
- **Scheduler**: Environment-aware scheduler with automatic optimization
  - **Browser**: Uses native `queueMicrotask` for smooth UI updates
  - **Node.js**: Uses `setImmediate` for better I/O performance
  - **DomScheduler**: Specialized scheduler with paint phase for DOM operations
  - Auto-detects environment and selects optimal implementation

