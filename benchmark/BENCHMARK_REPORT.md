# Benchmark Report

Last updated: 2025-08-02

## Test Environment
- Platform: darwin
- Node.js: v24.1.0
- Scheduler: queueMicrotask-based

## Results

### Map-Filter-Reduce (1,000,000 events)
Tests the performance of chained map, filter, and reduce operations.

| Library | Latency (avg) | Throughput (ops/s) | Relative Performance |
|---------|---------------|--------------------|---------------------|
| @aelea  | 6.83ms        | 147                | **100%** (baseline) |
| @most/core | 7.55ms     | 133                | 90.5%               |

**@aelea is 10.5% faster** than @most/core for map-filter-reduce operations.

### Scan (1,000,000 events)
Tests the performance of the scan (accumulator) operation.

| Library | Latency (avg) | Throughput (ops/s) | Relative Performance |
|---------|---------------|--------------------|---------------------|
| @aelea  | 7.69ms        | 130                | **100%** (baseline) |
| @most/core | 9.17ms     | 109                | 84.0%               |

**@aelea is 19.2% faster** than @most/core for scan operations.

### Switch (1,000 streams × 1,000 events)
Tests the performance of switching between multiple streams.

| Library | Latency (avg) | Throughput (ops/s) | Relative Performance |
|---------|---------------|--------------------|---------------------|
| @most/core | 133.1μs    | 7,598              | **100%** (baseline) |
| @aelea  | 208.3μs       | 4,852              | 63.8%               |

**@most/core is 56.5% faster** than @aelea for switch operations.

## Summary

- **@aelea** excels at basic stream operations (map, filter, reduce, scan)
- **@most/core** has better performance for complex switching scenarios
- The performance difference in switch operations suggests room for optimization in @aelea's switch implementation

## Optimization Opportunities

1. **Switch Performance**: The pre-allocated sink optimization helped, but there's still a significant gap with @most/core
2. **Memory Allocation**: Further reduction in object allocations could improve all operations
3. **Scheduler Overhead**: Consider specialized schedulers for different use cases

## Running Benchmarks

```bash
npx tsx benchmark/map-filter-reduce.ts
npx tsx benchmark/scan.ts
npx tsx benchmark/switch.ts
```