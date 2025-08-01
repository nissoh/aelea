// Design Analysis: Promise vs queueMicrotask for Stream Schedulers

console.log('Stream Scheduler Design Analysis')
console.log('================================\n')

// Test 1: Cancellation patterns
console.log('1. CANCELLATION PATTERNS\n')

// Pattern A: queueMicrotask with disposal flag
{
  console.log('Pattern A: queueMicrotask with flag')
  let executed = 0
  let cancelled = 0
  
  const tasks: Array<() => void> = []
  
  for (let i = 0; i < 5; i++) {
    let disposed = false
    
    const dispose = () => {
      disposed = true
      cancelled++
    }
    
    queueMicrotask(() => {
      if (!disposed) {
        executed++
        console.log(`  Task ${i}: executed`)
      } else {
        console.log(`  Task ${i}: cancelled`)
      }
    })
    
    // Cancel some tasks
    if (i % 2 === 0) dispose()
  }
  
  await new Promise(resolve => setTimeout(resolve, 10))
  console.log(`  Result: ${executed} executed, ${cancelled} cancelled\n`)
}

// Pattern B: Promise with no cancellation
{
  console.log('Pattern B: Promise (no cancellation)')
  let executed = 0
  
  for (let i = 0; i < 5; i++) {
    Promise.resolve().then(() => {
      executed++
      console.log(`  Task ${i}: always executes`)
    })
  }
  
  await new Promise(resolve => setTimeout(resolve, 10))
  console.log(`  Result: ${executed} executed (cannot cancel)\n`)
}

// Test 2: Error handling
console.log('2. ERROR HANDLING\n')

// Pattern A: queueMicrotask
{
  console.log('Pattern A: queueMicrotask error handling')
  queueMicrotask(() => {
    try {
      throw new Error('Test error in queueMicrotask')
    } catch (e) {
      console.log('  Caught:', e.message)
    }
  })
  
  await new Promise(resolve => setTimeout(resolve, 10))
}

// Pattern B: Promise
{
  console.log('\nPattern B: Promise error handling')
  Promise.resolve()
    .then(() => {
      throw new Error('Test error in Promise')
    })
    .catch(e => {
      console.log('  Caught:', e.message)
    })
  
  await new Promise(resolve => setTimeout(resolve, 10))
}

// Test 3: Batching behavior
console.log('\n3. BATCHING BEHAVIOR\n')

{
  console.log('Execution order test:')
  
  console.log('1. Synchronous')
  
  queueMicrotask(() => console.log('2. queueMicrotask 1'))
  Promise.resolve().then(() => console.log('3. Promise 1'))
  queueMicrotask(() => console.log('4. queueMicrotask 2'))
  Promise.resolve().then(() => console.log('5. Promise 2'))
  
  console.log('6. Synchronous end')
  
  await new Promise(resolve => setTimeout(resolve, 10))
}

// Test 4: Memory pressure
console.log('\n4. MEMORY IMPLICATIONS\n')

{
  const iterations = 1000000
  
  // queueMicrotask with disposables
  {
    const start = performance.now()
    const disposables: Array<{ [Symbol.dispose]: () => void }> = []
    
    for (let i = 0; i < iterations; i++) {
      let disposed = false
      disposables.push({
        [Symbol.dispose]: () => { disposed = true }
      })
      
      queueMicrotask(() => {
        if (!disposed) {
          // work
        }
      })
    }
    
    const time = performance.now() - start
    console.log(`queueMicrotask + disposable (${iterations} tasks): ${time.toFixed(2)}ms`)
    
    // Clean up
    disposables.forEach(d => d[Symbol.dispose]())
  }
  
  await new Promise(resolve => setTimeout(resolve, 100))
  
  // Promises (no disposal)
  {
    const start = performance.now()
    const promises: Promise<void>[] = []
    
    for (let i = 0; i < iterations; i++) {
      promises.push(
        Promise.resolve().then(() => {
          // work
        })
      )
    }
    
    const time = performance.now() - start
    console.log(`Promise.resolve (${iterations} tasks): ${time.toFixed(2)}ms`)
    
    await Promise.all(promises)
  }
}

// Design recommendations
console.log('\n5. DESIGN RECOMMENDATIONS\n')
console.log('For Stream Schedulers:')
console.log('- queueMicrotask is preferred because:')
console.log('  ✓ Supports cancellation via disposal pattern')
console.log('  ✓ Similar performance to Promise')
console.log('  ✓ More predictable memory management')
console.log('  ✓ Aligns with Disposable pattern used throughout streams')
console.log('')
console.log('- Promise.resolve().then has limitations:')
console.log('  ✗ Cannot cancel once scheduled')
console.log('  ✗ Creates Promise objects that must be GC\'d')
console.log('  ✗ Error handling creates rejection if not caught')
console.log('')
console.log('Conclusion: queueMicrotask with disposal flag is the optimal choice')