# Fufu
Functional Reactive Programming UI library based on [@most/core](https://github.com/mostjs/core) paradigm and [architecture](https://github.com/cujojs/most/wiki/Architecture)

## What
This project is pretty much a proof of concept with a few unresolved issues and unissued interface decisions.
Current mission is to discover the most conviniet/generic way to create UI abstractions

## Why
- UI is naturally reactive from both end points(user and server)
- CSS selectors, static styling replaced by much more powerfull Behaviors
- Imperative abstractions and a lot of boilerplate replaced by streams and Behaviors
- Avoid Large, Complex Layouts and Layout Thrashing by batching dom operations
- Model your application through reactive streams without chaotic state management tools, i.e. flux, redux etc
- Possibly has the best possible performance since diffing is obselete and mutating states relay on stream computation


### Simple Counter
```typescript
import { map, switchLatest, constant, periodic, scan } from '@most/core'
import { newDefaultScheduler } from '@most/scheduler'

import { text, renderTo } from 'fufu'
import { pipe } from '../common' // (f1, f2) => x => f2(f1(x))

const add = (n1: number, n2: number) => n1 + n2

const oneEverySecond = constant(1 ,periodic(1000))
const accumulate = scan(add, 0, oneEverySecond)

const counter = switchLatest(map(pipe(String, text), accumulate))

branch(xForver(document.body), counter)
  .run(nullSink, newDefaultScheduler())
```

### Simple Input binding - view | style | Behavior
```typescript
import { constant, map, merge, scan, switchLatest, mergeArray } from '@most/core'
import { pipe } from '../utils'
import { style, branch, text, node, component, domEvent } from 'fufu'
import * as stylesheet from '../stylesheet'


const styledBtn = stylesheet.btn(node)
const centeredContainer = pipe(stylesheet.centerStyle, stylesheet.row)(node)

const countBtn = (str: string) => style({ margin: '6px' }, branch(styledBtn, text(str)))
const add = (x: number, y: number) => (x + y)

const click = domEvent('click')

const actions = {
  countUp:   pipe(click, constant(1)),
  countDown: pipe(click, constant(-1))
}

export const counter = component(actions, ({ countUp, countDown }) => {
  const count = scan(add, 0, merge(countUp, countDown))

  return branch(centeredContainer, mergeArray([
    countUp.sample(countBtn('+1')),
    countDown.sample(countBtn('-1')),
    switchLatest(map(pipe(String, text), count))
  ]))
})


branch(xForver(document.body), counter)
  .run(nullSink, newDefaultScheduler())
```


## Running examples

`yarn run add-ui`

`yarn run counters`

`yarn run simple-input`
