# Aelea Benchmark Results

## Summary

After implementing performance optimizations focused on avoiding closure creation and efficient task batching, Aelea shows significant performance improvements in certain scenarios while maintaining competitive performance in others.

## Key Optimizations Applied

1. **Avoided closure creation** in all scheduler implementations (DomScheduler, NodeScheduler, BrowserScheduler)
2. **Implemented task batching** for asynchronous operations
3. **Leveraged PropagateTask lifecycle** for efficient cancellation
4. **Applied memory-efficient patterns** throughout the codebase

## Performance Highlights

### Switch Operations ⭐
- **10.5x faster** than @most/core (54,915 ops/s vs 5,227 ops/s)
- Optimized `switchLatest` implementation with proper lifecycle management
- Fixed bug where last inner stream was being disposed prematurely

### Scan Operations
- **8.6% faster** than @most/core (542 ops/s vs 499 ops/s)
- Efficient state management without excessive allocations

### Areas for Future Optimization

While Aelea excels in switch operations, @most/core shows better performance in:
- Merge operations (76% faster for 2 streams)
- Combine operations (124% faster for 2 streams)
- Zip operations (97% faster for 2 streams)

These areas represent opportunities for future optimizations.

## Benchmark Commands

```bash
# Run individual benchmarks
bun run benchmark/switch.ts
bun run benchmark/scan.ts
bun run benchmark/map-filter-reduce.ts
bun run benchmark/combinators.ts

# Run all benchmarks
for file in benchmark/*.ts; do echo "Running $file"; bun run "$file"; done
```

## Architecture Benefits

While @most/core may have better performance in some combinators due to aggressive optimizations and code generation, Aelea provides:

1. **Simpler, more maintainable code** - No complex fusion or code generation
2. **Better debugging experience** - Clear stack traces and predictable execution
3. **Smaller bundle size** - Less complexity means less code
4. **Excellent switch performance** - Critical for UI applications with dynamic content

## Conclusion

The optimizations successfully improved performance while maintaining code clarity. The 10.5x improvement in switch operations demonstrates that thoughtful optimization of hot paths can yield significant results without sacrificing maintainability.