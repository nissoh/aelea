import { $Node } from './types'
import { chain } from '@most/core'
import { Scheduler, Sink } from '@most/types'
import { StyleRule } from './combinators/style'
import { createNodeContainer } from './source/node'



// missing adoptedStyleSheets type
declare global {
  interface Document {
    adoptedStyleSheets: CSSStyleSheet[];
  }
}


export function runAt<T extends $Node>(rootNode: T, scheduler: Scheduler) {
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, StyleRule.stylesheet]

  const effectsSink: Sink<unknown> = {
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

