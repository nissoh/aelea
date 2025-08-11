# Aelea Stream Extended

Extended stream utilities built on top of the core stream library.

## Multicast

Share stream subscriptions among multiple consumers. The multicast system provides:
- `multicast`: Share a single stream subscription among multiple consumers
- `state`: Stateful streams that remember their last value

## Tether

A tether is a sink that can accept values and feed them into a stream:
- Acts as an input mechanism for streams
- Allows external values to be pushed into the stream ecosystem
- Foundation for bidirectional data flow patterns

## Behaviors

Behaviors combine multicast streams with tethers to enable bidirectional data flow:
- A behavior is a pair: `[stream, tether]`
- The stream (multicast) flows data out to multiple consumers
- The tether accepts data in, updating all consumers
- Built on top of both multicast and tether
- Used for reactive UI components that both display and modify state

```typescript
const [temperature$, temperatureTether] = behavior<number>()
// temperature$ - multicast stream of temperature values (output)  
// temperatureTether - tether that accepts new temperature values (input)
```

## Additional Utilities

- **buffer**: Buffer events based on various strategies
- **fromWebsocket**: Create streams from WebSocket connections
- **promise**: Promise-based stream utilities
- **fetch**: HTTP fetch integration with streams