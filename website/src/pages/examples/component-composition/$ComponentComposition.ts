import { type IBehavior, state } from 'aelea/stream-extended'
import { component } from 'aelea/ui'
import { $SimpleCounterList } from './$SimpleCounterList'

// Example: Component Composition with Bidirectional Data Flow
export const $ComponentComposition = component(([changeCounterList, changeCounterListTether]: IBehavior<number[]>) => {
  // Parent manages the state
  const counterList = state(changeCounterList, [0, 0])

  return [
    $SimpleCounterList({ counterList })({
      changeCounterList: changeCounterListTether()
    })
  ]
})({})

/* 
Key Concepts Demonstrated:

1. **Parent-Child Communication**:
   - Parent owns the state (counterList)
   - Child receives state as a stream
   - Child outputs changes via behaviors

2. **Bidirectional Data Flow**:
   - Data flows down: counterList stream
   - Events flow up: changeCounterList behavior
   - State updates trigger reactive re-renders

3. **Component Composition**:
   - $SimpleCounter is composed within $SimpleCounterList
   - Each component has clear inputs and outputs
   - Components are reusable and testable

4. **Reactive Updates**:
   - Individual counters update via mapped streams
   - List structure updates trigger re-renders
   - All updates flow through the parent state
*/
