# Aelea Stream Library

A reactive stream library for composing asynchronous and event-based programs.

## Stream Diagram Notation

Throughout the documentation, we use ASCII diagrams to visualize stream behavior over time. Understanding this notation is key to understanding stream operations.

### Basic Rules
- **Each character represents one unit of time**
- **`-` represents empty time (no event)**
- **Letters/numbers represent values emitted at that time**
- **`|` represents stream completion**
- **`>` represents ongoing stream**
- **`x` often represents a signal event**

### Examples

```
stream: -a-b-c->
```
A stream that emits 'a' at time 1, 'b' at time 3, 'c' at time 5, and continues.


### Multiple Streams
When showing multiple streams interacting:

```
streamA: -1---3---5->
streamB: --a---b|
merge:   -1a--3b--5->
```

The streams are time-aligned vertically - events at the same column position happen at the same time.

### Complex Values
When values are too complex to fit in a single character, we use reference notation:

```
streamA:    -1---2|
streamB:    ---a---b-c---->
combineMap: ---A-B-C-D---->
               | | | |
               | | | +-- [2,c]
               | | +-- [2,b]
               | +-- [2,a]
               +-- [1,a]
```

Here, A, B, C, D, E are single-character references with their actual array values shown below using vertical connectors. This notation is used when the actual values (like arrays, objects, or multi-digit numbers) cannot fit in a single character.

## Philosophy

### Error Handling

This library distinguishes between **stream failures** and **application errors**:

- **Application error**: Recoverable error. Sources should catch and transform to events when possible
- **Stream failure**: Cannot produce more events. Sources should call `error()` then `end()`

### Stream Lifecycle

- **event**: Normal data events
- **error**: Error events (non-terminal by default)
- **end**: Stream completion (terminal - no more events)
- **dispose**: Resource cleanup (terminal - no more events - no furthur sink feedback)

## Stream Contract

### Source Responsibilities
- A source MUST NOT emit events after calling `end()`
- A source MUST NOT call `end()` more than once
- A source MAY emit multiple `error()` events (for application/recoverable errors)
- A source SHOULD call `error()` followed by `end()` for stream failures (unrecoverable errors where no more events can be produced)
- A source MUST NOT emit any events after being disposed

### Sink Responsibilities
- A sink MUST handle multiple `error()` calls gracefully
- A sink MUST handle `dispose()` being called at any time
- A sink SHOULD NOT assume the source follows the contract perfectly
- A sink MUST NOT call any source methods after being disposed

## Core Concepts

### Streams
Streams are lazy, composable event sources that emit values over time.

### Schedulers
Control the timing of event delivery.

### Operators
Transform, filter, and combine streams.