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

This library distinguishes between **application errors** and **stream failures**:

- **Application error**: Recoverable. `error()` is applicative: it reports and the stream continues. A combinator whose user function throws, a source whose one value fails to decode, and a consumer whose `event` handler throws all report this way.
- **Stream failure**: The producer cannot produce more events. It calls `error()` then `end()`.

A consumer that throws from its own `error()` or `end()` handler has no in-band channel left; the fault is reported out of band through the host's uncaught-exception path (`reportError` where available) and never fed back into the pipeline.

### Stream Lifecycle

- **event**: Normal data events
- **error**: Error events (non-terminal)
- **end**: Stream completion (terminal - no more events)
- **dispose**: Resource cleanup (terminal - no more events - no further sink feedback)

### Resource Release

`end` is self-cleaning: a stream releases every subscription and timer it holds at the moment it forwards `end`. A consumer never has to dispose a subscription that has ended, and a stream that ended synchronously inside `run` hands back an already-released handle.

A shared stream (`multicast`, `state`, `tether`) is one shared run of its source. Disposal of the last subscriber cancels that run and a later subscriber starts a fresh one. The source ending closes the shared stream for good: late subscribers receive `end` (after the replayed value, for `state`).



## Stream Contract

### Source Responsibilities
- A source MUST NOT emit events after calling `end()`
- A source MUST NOT call `end()` more than once
- A source MAY emit multiple `error()` events (for application/recoverable errors)
- A source MUST call `error()` followed by `end()` for stream failures (unrecoverable errors where no more events can be produced)
- A source MUST NOT emit any events after being disposed
- A source MUST release everything it holds when it calls `end()`

### Sink Responsibilities
- A sink MUST handle multiple `error()` calls gracefully
- A sink MUST tolerate its subscription being disposed at any time
- A sink SHOULD NOT assume the source follows the contract perfectly
- A sink MUST NOT call any source methods after being disposed

## Core Concepts

### Streams
Streams are lazy, composable event sources that emit values over time.

### Schedulers
Control the timing of event delivery.

### Operators
Transform, filter, and combine streams.
