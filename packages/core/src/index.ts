import { ElementStream } from './types'
import { chain } from '@most/core'
import { Scheduler, Sink } from '@most/types'
import { StyleRule } from 'src/combinator/style'
import { createNodeContainer } from 'src/source/node'


export * from './combinator/style'
export * from './combinator/event'
export * from './utils'
export * from './combinator/attribute'
export * from './behavior'
export * from './combinator/component'
export * from './combinator/animate'
export * from './source/node'
export * from './types'


// missing adoptedStyleSheets type
declare global {
  interface Document {
    adoptedStyleSheets: CSSStyleSheet[];
  }
}


export function runAt(rootNode: ElementStream, scheduler: Scheduler) {
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, StyleRule.stylesheet]

  const effectsSink: Sink<any> = {
    event() { },
    error(_, err) {
      // tslint:disable-next-line: no-console
      console.error(err)
    },
    end() { }
  }

  return chain(root => createNodeContainer(root, StyleRule.stylesheet), rootNode)
    .run(effectsSink, scheduler)
}
