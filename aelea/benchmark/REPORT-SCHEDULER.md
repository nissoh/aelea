# Scheduler Performance Report

Last updated: 2024-12-17

## Overview

This report analyzes the performance characteristics of different scheduling mechanisms available in JavaScript/Node.js environments. Understanding these differences is crucial for implementing efficient stream schedulers.

## Test Results

### Pure Scheduling Performance (No Work)

| Method | Latency (ns) | Throughput (ops/s) | Relative Speed |
|--------|--------------|-------------------|----------------|
| Promise.resolve().then | 124.21 | 8,814,499 | 1.00x (fastest) |
| queueMicrotask | 143.07 | 7,695,841 | 0.87x |
| setImmediate | 800.80 | 1,313,220 | 0.15x |
| setTimeout(0) | 1,133,256 | 883 | 0.0001x |

### Scheduling with Work (100,000 iterations)

| Method | Latency (ns) | Throughput (ops/s) | Relative Speed |
|--------|--------------|-------------------|----------------|
| queueMicrotask + work | 25,743 | 38,969 | 1.00x (fastest) |
| Promise.then + work | 25,847 | 38,865 | 1.00x |
| setImmediate + work | 26,848 | 37,650 | 0.97x |
| setTimeout(0) + work | 1,185,196 | 846 | 0.02x |

## Key Findings

### 1. Microtask Queue Performance
- **Promise.resolve().then** and **queueMicrotask** are the fastest scheduling mechanisms
- Both execute in the microtask queue with minimal overhead
- Promise.resolve().then has slightly better performance in pure scheduling scenarios

### 2. Task Queue Performance
- **setImmediate** is 6-7x slower than microtask mechanisms for pure scheduling
- With actual work, the performance gap narrows significantly
- Still suitable for I/O-heavy operations where immediate execution isn't critical

### 3. Timer Queue Performance
- **setTimeout(0)** is extremely slow, ~9000x slower than microtask mechanisms
- Even with work, it remains ~46x slower than other options
- Should be avoided for high-frequency scheduling

## Implications for Stream Schedulers

### Cancellation Considerations

While `Promise.resolve().then` shows slightly better raw performance, it has a critical limitation: **promises cannot be cancelled**. This is essential for stream disposal patterns.

**queueMicrotask advantages:**
- ✓ Supports cancellation via disposal flag pattern
- ✓ Aligns with the Disposable pattern used throughout streams
- ✓ Predictable memory management
- ✓ Near-identical performance to Promise

**Promise limitations:**
- ✗ Cannot cancel once scheduled
- ✗ Creates Promise objects that must be GC'd
- ✗ No way to prevent execution after disposal

### Recommended Implementation Strategy

1. **For `asap` scheduling**: Use `queueMicrotask`
   - Provides excellent performance
   - Supports proper cancellation/disposal
   - Standard API across modern environments
   - Predictable microtask queue behavior

2. **For `delay` scheduling**: Use `setTimeout`
   - Only viable option for true delays
   - Native cancellation support via clearTimeout
   - Performance overhead acceptable for delayed operations

3. **Avoid setImmediate and Promise.resolve()**
   - setImmediate: Not standard, worse performance
   - Promise.resolve(): No cancellation support

## Scheduler Implementation Example

```typescript
export const performantScheduler: Scheduler = {
  asap<TArgs extends any[], T>(
    sink: Sink<T>,
    callback: (sink: Sink<T>, ...args: TArgs) => void,
    ...args: TArgs
  ) {
    let disposed = false
    
    // Use queueMicrotask for optimal performance
    queueMicrotask(() => {
      if (!disposed) {
        callback(sink, ...args)
      }
    })
    
    return {
      [Symbol.dispose]: () => { disposed = true }
    }
  },
  
  delay<TArgs extends any[], T>(
    sink: Sink<T>,
    callback: (sink: Sink<T>, ...args: TArgs) => void,
    delay: number,
    ...args: TArgs
  ) {
    const id = setTimeout(() => callback(sink, ...args), delay)
    return {
      [Symbol.dispose]: () => clearTimeout(id)
    }
  },
  
  time: () => Date.now()
}
```

## Conclusion

The benchmark results clearly show that:
1. **Microtask-based scheduling** (queueMicrotask/Promise) provides the best performance
2. **setTimeout** should only be used when actual delays are needed
3. The choice of scheduler significantly impacts stream performance, especially for high-frequency operations

For the @aelea/stream library, using queueMicrotask for asap scheduling provides optimal performance while maintaining cross-platform compatibility.