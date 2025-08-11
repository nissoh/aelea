# Aelea Stream Library

A reactive stream library for composing asynchronous and event-based programs.

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