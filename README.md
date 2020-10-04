# Fufu
Functional Reactive Programming UI library based on [@most/core](https://github.com/mostjs/core) paradigm and [architecture](https://github.com/cujojs/most/wiki/Architecture)

Invent Complex Apps


# Why - 
- UI is naturally reactive from both end points(user and server)
- Imperative abstractions and a lot of boilerplate replaced by streams and Behaviors
- Avoid Large, Complex Layouts and Layout Thrashing by batching dom operations
- Model your application through reactive computations without instead of unpredictable immutble state
- Highly performant, diffing is obselete and mutating states relay on stream computation

### CSS
- CSS Dom instead of global stylesheets



### Simple Counter
```typescript
import { map, switchLatest, constant, periodic, scan } from '@most/core'
import { newDefaultScheduler } from '@most/scheduler'

import { text, renderTo } from 'fufu'
import { pipe } from '../common'

const add = (n1: number, n2: number) => n1 + n2

const oneEverySecond = constant(1 ,periodic(1000))
const accumulate = scan(add, 0, oneEverySecond)

const counter = switchLatest(map(pipe(String, text), accumulate))

branch(xForver(document.body))(
  counter
).run(nullSink, newDefaultScheduler())
```

### Simple counter - view | style | Behavior
```typescript
import { constant, map, merge, scan, switchLatest, mergeArray } from '@most/core'
import { pipe } from '../utils'
import { style, branch, text, node, component, domEvent } from 'fufu'
import * as designSheet from '../stylesheet'


const styledBtn = designSheet.btn(node)
const centeredContainer = pipe(designSheet.centerStyle, designSheet.row)(node)

const countBtn = (str: string) => style({ margin: '6px' }, branch(styledBtn, text(str)))
const add = (x: number, y: number) => (x + y)

const click = domEvent('click')

const actions = {
  countUp:   pipe(click, constant(1)),
  countDown: pipe(click, constant(-1))
}

export const counter = component(actions, ({ countUp, countDown }) => {
  const count = scan(add, 0, merge(countUp, countDown))

  return branch(centeredContainer)(
    mergeArray([
      countUp.attach(countBtn('+1')),
      countDown.attach(countBtn('-1')),
      switchLatest(map(pipe(String, text), count))
    ])
  )
})


branch(xForver(document.body))(
  counter
).run(nullSink, newDefaultScheduler())
```


## Running examples

`yarn run add-ui`

`yarn run counters`

`yarn run simple-input`
