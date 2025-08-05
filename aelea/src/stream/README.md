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
- **dispose**: Resource cleanup

## Core Concepts

### Streams
Streams are lazy, composable event sources that emit values over time.

### Behaviors
Behaviors are bidirectional stream connectors that enable two-way data flow:
- A behavior is a pair: `[stream, tether]`
- The stream flows data out, the tether accepts data in
- Used for reactive UI components that both display and modify state

```typescript
const [temperature$, temperatureTether] = behavior<number>()
// temperature$ - stream of temperature values (output)
// temperatureTether - accepts new temperature values (input)
```

### Schedulers
Control the timing of event delivery.

### Operators
Transform, filter, and combine streams.

### Multicast
Share stream subscriptions among multiple consumers.