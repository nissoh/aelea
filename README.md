# Fufu
Functional Reactive Programming UI library based on [@most/core](https://github.com/mostjs/core) paradigm and [architecture](https://github.com/cujojs/most/wiki/Architecture)

## What
This project is pretty much is a proof of concept with a few unresolved issues and unissued interface decisions.
Current mission is to discover the most conviniet/generic way to create UI abstractions

## Why
- UI is naturally reactive from both end points(user and server)
- CSS selectors, static styling replaced by much more powerfull behaviours
- Imperative abstractions and a lot of boilerplate replaced by streams and behaviours
- Avoid Large, Complex Layouts and Layout Thrashing by batching dom operations
- Model your application through reactive streams without chaotic state management tools, i.e. flux, redux etc
- Possibly has the best possible performance since diffing is obselete and mutating states relay on stream computation


### Simple Counter
```typescript
import { map, switchLatest, constant, periodic, scan } from '@most/core'
import { text, renderTo } from '@fufu/core'
import { pipe } from '../common' // (f1, f2) => x => f2(f1(x))

const add = (n1: number, n2: number) => n1 + n2

const oneEverySecond = constant(1 ,periodic(1000))
const accumulate = scan(add, 0, oneEverySecond)

const counter = switchLatest(map(pipe(String, text), accumulate))

renderTo(document.body, counter)
```

### Simple Input binding - view | style | behaviour
```typescript
import { chain, map, merge, switchLatest, constant } from '@most/core'
import { domEvent, branch, text, node, component, element, renderTo, style } from '@fufu/core'
import { pipe } from '../common'

const inputValue = pipe(
  chain(domEvent('input')),
  map(pipe(ev => ev.target.value, String))
)

const inputComponenet = component(({ input }) => {
  const inputElement = input.sample(inputValue, element('input'))

  const containerStyle = style(constant({background: '#e6e6e6', padding: '10px', display: 'flex', flexDirection: 'column'}))
  const container = containerStyle(node)

  return branch(container, merge(
    inputElement, // <node><input/></node>
    switchLatest(map(text, input)) // stream of text
  ))
})

renderTo(document.body, inputComponenet)
```


## Running examples

`yarn run add-ui`

`yarn run counters`

`yarn run simple-input`
