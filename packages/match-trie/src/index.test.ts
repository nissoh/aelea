import { it, describe } from '@typed/test'
import { now } from '@most/core'
import { resolveUrl, resolve } from './index'
import { collectOne } from '../utils'
import { createPathState } from './resolve'
import { curry2 } from '@most/prelude'
import { O } from 'fufu'

const rawFragments = ['main', 'books', '3', 'chapters', '1']
const paths = now(rawFragments)
const urlFragments = now(rawFragments.join('/'))

const url1Comp = O(
  resolveUrl('main'),
  resolve('books'),
  resolve(/\d+/)
)

interface Prop {
  <T, K extends keyof T>(key: K): (obj: T) => T[K]
  <T, K extends keyof T>(key: K, obj: T): T[K]
}


const prop: Prop = curry2((key, obj: any) => obj[key])



export default describe(`basic tests`, [
  it('matches fragments', async ({ equal }) => {
    const frsgs = (await collectOne(url1Comp(urlFragments))).fragments
    equal(frsgs, ['main', 'books', /\d+/])
  }),
  it('matches resolved fragments', ({ equal }) =>
    collectOne(url1Comp(urlFragments)).then(
      O(prop('resolvedFragments'), equal(['main', 'books', '3']))
    )
  ),
  it('matches remaining target fragments', ({ equal }) =>
    collectOne(resolve('main', createPathState(paths))).then(
      O(prop('targetRemaining'), equal(['books', '3', 'chapters', '1']))
    )
  ),
  it('matches remainig target url', ({ equal }) =>
    collectOne(url1Comp(urlFragments)).then(
      O(prop('targetRemaining'), equal(['chapters', '1']))
    )
  )
])


