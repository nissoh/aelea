
import { switchLatest, now, constant } from '@most/core'
import { xForver } from '../utils'
import { nullSink, component, domEvent, style, branch, element, text } from 'fufu'
import { newDefaultScheduler } from '@most/scheduler'
import { resolveUrl, resolve, PathEvent } from 'match-trie'
import { NodeStream } from '../../../core/src/types'
import { Stream } from '@most/types'
import * as stylesheet from '../style/stylesheet'
import { row, column } from '../common/flex'


const styledBtn = stylesheet.btn(element('anchor'))
const btn = (str: string) => style({ margin: '6px' }, branch(styledBtn, text(str)))

const initialPath = now(document.location.pathname.substr(1))

const mainRoute = resolveUrl('main', initialPath)
const p1 = resolve('p1', mainRoute)
const p2 = resolve('p2', mainRoute)


const switchRoute = (ps: Stream<PathEvent>, node: NodeStream) => switchLatest(constant(node, ps))



const click = domEvent('click')
const actions = {
  p1Click: click,
  p2Click: click
}

const main = component(actions, ({ p1Click, p2Click }) =>
  switchRoute(mainRoute, stylesheet.mainCentered(column(
    row(
      p1Click.attach(btn('p1')),
      p2Click.attach(btn('p2'))
    ),
    switchRoute(p1, row(text('p1'))),
    switchRoute(p2, row(text('p2')))
  )))
)

branch(xForver(document.body), main).run(nullSink, newDefaultScheduler())

