require('jsdom-global')()

import { it, describe } from '@typed/test'
import { node, branch } from './index'
import { take } from '@most/core'
import { curry2 } from '@most/prelude'
import { pipe } from '../../examples/src/utils'
import { collectEvents, Event } from '../utils'


const eqInstance = curry2((b: Function, a: Object) => a instanceof b)
const fstEventValue = <T>(a: Event<T>[]) => a[0].value

const isNode = pipe(fstEventValue, eqInstance(Node))

const take1 = take(1)

export const test =  describe(`basic tests`, [
  it('Emits node', ({ ok }) =>
    collectEvents(take1(node)).then(pipe(isNode, ok))
  ),
  it('Emits node using branch', ({ ok }) =>
    collectEvents(take1(branch(node, node))).then(pipe(isNode, ok))
  )
])

