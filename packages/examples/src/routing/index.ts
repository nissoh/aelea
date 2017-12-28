
import { switchLatest, merge, now, constant } from '@most/core'
import { xForver } from '../utils'
import { nullSink, component, domEvent, style, branch, node, element, text } from 'fufu'
import { newDefaultScheduler } from '@most/scheduler'
import { resolveUrl, resolve, PathEvent } from 'match-trie'
import { NodeStream } from '../../../core/src/types'
import { Stream } from '@most/types'
import * as stylesheet from '../stylesheet'


const styledBtn = stylesheet.btn(element('anchor'))
const btn = (str: string) => style({ margin: '6px' }, branch(styledBtn, text(str)))

const initialPath = now(document.location.pathname.substr(1))

const mainRoute = resolveUrl('main', initialPath)
const p1 = resolve('p1', mainRoute)
const p2 = resolve('p2', mainRoute)


const switchRoute = (ps: Stream<PathEvent>, node: NodeStream) => switchLatest(constant(node, ps))


const root = branch(xForver(document.body))

const branchC = branch(node)

// const columnB = branch(stylesheet.column(node))
const rowB = branch(stylesheet.row(node))

const click = domEvent('click')
const actions = {
  p1Click: click,
  p2Click: click
}

component(actions, ({ p1Click, p2Click }) => root(
  switchRoute(mainRoute, branch(stylesheet.mainCentered(node))(merge(
    rowB(merge(
      p1Click.sample(btn('p1')),
      p2Click.sample(btn('p2'))
    )),
    merge(
      switchRoute(p1, branchC(text('p1'))),
      switchRoute(p2, branchC(text('p2')))
    )
  )))
)).run(nullSink, newDefaultScheduler())

