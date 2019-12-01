import {Stream, Sink, Scheduler, Disposable} from '@most/types'
import {disposeWith} from '@most/disposable'
import {CurriedFunction2} from '@most/prelude'
import {NodeType} from '../types'




function disposeNode(el: Node) {
  if (el.parentElement && el.parentElement.contains(el)) {
    el.parentElement.removeChild(el)
  }
}



export class NodeStream<R extends NodeType> implements Stream<R> {
  constructor(private nodeCreationFn: (cv: string) => R, private cv: string) {}

  run(sink: Sink<R>, scheduler: Scheduler) {
    const node = this.nodeCreationFn(this.cv)

    sink.event(scheduler.currentTime(), node)

    return disposeWith(disposeNode, node)
  }
}

const createElement =  (s: string) => document.createElement(s)
const createTextNode = (s: string) => document.createTextNode(s)

export const node:Stream<HTMLElement> =new NodeStream(createElement, 'node')

export const element = (name: string): Stream<HTMLElement> => {
  return new NodeStream(createElement, name)
}


export const text = (s: string): Stream<Text> => {
  return new NodeStream(createTextNode, s)
}



export {Disposable, CurriedFunction2}
