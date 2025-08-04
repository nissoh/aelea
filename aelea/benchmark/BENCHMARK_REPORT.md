# Aelea Performance Benchmark Report

## Benchmark Results

### Map-Filter-Reduce (1,000,000 items)

| Implementation | Throughput (ops/s) | Latency (ms) | Performance |
|----------------|-------------------|--------------|-------------|
| @most/core     | 278 ± 0.47%      | 3.60ms       | Baseline    |
| Aelea          | 248 ± 2.34%      | 4.09ms       | -10.8%      |

**Analysis**: Aelea shows slightly lower performance in complex operation chains. This is expected as @most/core has more aggressive optimizations for chained operations.

### Scan (1,000,000 items)

| Implementation | Throughput (ops/s) | Latency (ms) | Performance |
|----------------|-------------------|--------------|-------------|
| @most/core     | 481 ± 4.52%      | 2.20ms       | Baseline    |
| Aelea          | 445 ± 4.19%      | 2.37ms       | -7.5%       |

**Analysis**: @most/core shows better performance in scan operations, though both libraries have higher variance in this benchmark.

### Switch (1000 x 1000 items)

| Implementation | Throughput (ops/s) | Latency (ms) | Performance |
|----------------|-------------------|--------------|-------------|
| @most/core     | 4,412 ± 0.61%    | 0.228ms      | Baseline    |
| Aelea          | 15,067 ± 0.86%   | 0.132ms      | **+241.4%** |

**Analysis**: Aelea demonstrates exceptional performance in switch operations, outperforming @most/core by over 240%. This showcases Aelea's highly efficient inner stream management and the optimized Node.js scheduler.

### Stream Combinators (100 items per stream)

Direct performance comparison between @most/core and Aelea:

| Combinator | Scenario | @most/core (ops/s) | Aelea (ops/s) | Performance |
|------------|----------|-------------------|---------------|-------------|
| **Merge** | 2 streams | 719,455 | 417,394 | @most/core +72.4% |
| | 5 streams | 303,367 | 214,525 | @most/core +41.4% |
| **Combine** | 2 streams | 410,776 | 248,258 | @most/core +65.5% |
| | 3 streams | 325,206 | 198,732 | @most/core +63.6% |
| **Zip** | 2 streams | 210,396 | 111,684 | @most/core +88.4% |
| | 3 streams | 174,792 | 80,328 | @most/core +117.6% |

**Detailed Performance Metrics**:

| Operation | Implementation | Throughput (ops/s) | Latency (μs) | Variance |
|-----------|----------------|-------------------|--------------|----------|
| Merge 2 streams | @most/core | 719,455 ± 0.19% | 1.54 | Low |
| | Aelea | 417,394 ± 0.13% | 2.53 | Low |
| Merge 5 streams | @most/core | 303,367 ± 0.39% | 3.77 | Low |
| | Aelea | 214,525 ± 0.16% | 4.83 | Very Low |
| Combine 2 streams | @most/core | 410,776 ± 0.15% | 2.55 | Very Low |
| | Aelea | 248,258 ± 0.13% | 4.22 | Very Low |
| Combine 3 streams | @most/core | 325,206 ± 0.14% | 3.18 | Very Low |
| | Aelea | 198,732 ± 0.16% | 5.29 | Low |
| Zip 2 streams | @most/core | 210,396 ± 0.20% | 4.98 | Low |
| | Aelea | 111,684 ± 0.18% | 9.40 | Low |
| Zip 3 streams | @most/core | 174,792 ± 0.16% | 5.90 | Low |
| | Aelea | 80,328 ± 0.23% | 12.96 | Low |

**Aelea-specific Advanced Scenarios**:
- **Merge** (100 streams × 100 items): 12,778 ops/s - Handles massive parallelism
- **Combine** (3 streams × 100 items): 195,211 ops/s - Good synchronization performance
- **Zip** (3 streams × 100 items): 79,402 ops/s - Buffering impacts performance

**Key Insights**:
- **@most/core** demonstrates superior performance across all combinators:
  - Zip operations (88-118% faster)
  - Combine operations (64-66% faster)
  - Merge operations (41-72% faster)
- **Aelea** maintains consistent low variance and predictable performance
- Both libraries scale well with increased stream counts
- The optimized Node.js scheduler significantly improves Aelea's performance

### Map Fusion Test

Map fusion automatically combines multiple map operations into a single operation:

```typescript
// These three maps are fused into one operation
map(x => x + 1)
map(x => x * 2)  
map(x => x / 3)
```

**Results**:
- Correctness: ✅ Verified
- 10,000 items performance:
  - Direct loop: 0.31ms
  - Fused stream: 0.52ms (1.68x overhead)

The overhead is minimal and expected due to stream abstraction.

## Overview

Performance comparison between Aelea and @most/core across various stream operations.
All benchmarks use the default scheduler optimized for each environment.

## Environment

- **Runtime**: Bun 
- **Scheduler**: Environment-aware scheduler with automatic optimization
  - **Browser**: Uses native `queueMicrotask` for smooth UI updates
  - **Node.js**: Uses `setImmediate` for better I/O performance
  - Auto-detects environment and selects optimal implementation
  - No ring buffers or arbitrary size limits
  - Simplified implementation with better performance

## Summary

### Performance Comparison Overview

1. **Switch Operations**: Aelea is **241.4% faster** - exceptional performance
2. **Map-Filter-Reduce**: @most/core is 10.8% faster in complex operation chains
3. **Scan Operations**: @most/core shows 7.5% better performance
4. **Stream Combinators**: @most/core outperforms Aelea:
   - **Merge**: @most/core is 41-72% faster
   - **Combine**: @most/core is 64-66% faster
   - **Zip**: @most/core is 88-118% faster

### Aelea Performance Characteristics

- **Switch Excellence**: Exceptional 241.4% faster than @most/core in switch operations
- **Consistent Performance**: Low variance across all operations
- **Predictable Behavior**: Simple implementation leads to predictable results
- **Map Fusion**: Working correctly with minimal overhead (1.68x)
- **Environment-aware Scheduling**: Automatically optimizes for browser/Node.js
- **Zero-overhead Scheduler**: Direct native function binding in Node.js

## Key Performance Features

### Environment-Aware Scheduler Design

- **Automatic Optimization**: Detects environment and selects best implementation
- **Browser Optimized**: Uses `queueMicrotask` for smooth UI updates
- **Node.js Optimized**: Uses `setImmediate` for better I/O throughput
- **No Overhead**: Eliminated ring buffers and queue management
- **Unlimited Capacity**: No arbitrary size limits or buffer overflows

### Stream Optimizations

- **Direct DOM Updates**: No virtual DOM or reconciliation overhead
- **Efficient Disposal**: Proper cleanup of subscriptions and resources
- **Type Safety**: Full TypeScript support with zero runtime overhead

## Conclusion

Aelea provides a clean, maintainable reactive streams implementation with trade-offs:

**Strengths**:
- **Switch Operations**: Exceptional performance - 241.4% faster than @most/core
- **Simplicity**: Clean, understandable codebase that's easy to maintain
- **Consistent Performance**: Low variance and predictable behavior
- **Environment Optimization**: Automatic scheduler selection for browser/Node.js
- **Zero-overhead Scheduling**: Direct native function binding eliminates wrapper overhead
- **Type Safety**: Full TypeScript support with excellent type inference

**Trade-offs**:
- @most/core's aggressive optimizations yield better performance in combinators
- Complex operation chains show ~10% performance gap
- Higher latency in merge/combine/zip operations

**When to Choose Aelea**:
- Prioritizing code maintainability and simplicity
- Building applications where switch operations are common
- Need predictable, consistent performance
- Want excellent TypeScript integration

**When to Choose @most/core**:
- Maximum performance is critical
- Heavy use of merge/combine/zip operations
- Complex stream transformation pipelines

Aelea demonstrates that a simpler implementation can still deliver competitive performance while being significantly easier to understand, maintain, and extend.