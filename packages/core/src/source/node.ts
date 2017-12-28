import { Disposable } from '@most/types'
import { applyStream, DisposableValue, ApplyStream } from './apply'
import { pipe } from '../utils'
export { Disposable, ApplyStream }




export class DisposeNode<A extends Node> implements DisposableValue<A> {
  value = this.fn()

  constructor (public fn: () => A) {}
  dispose () {
    if (this.value.parentElement && this.value.parentElement.contains(this.value)) {
      this.value.parentElement.removeChild(this.value)
    }
  }
}


const resolveNode = <T extends Node>(rfn: () => T) => () => new DisposeNode(rfn)

const createNodeFn = (tagname: string) => () => document.createElement(tagname)
const createTextFn = (text: string) => () => document.createTextNode(text)

export const element = pipe(pipe(createNodeFn, resolveNode), applyStream)
export const text =    pipe(pipe(createTextFn, resolveNode), applyStream)

export const node = element('node')

export function nodeWithAttrs (tagName: string, attrs?: {[key: string]: string}) {
  const node = document.createElement(this.tagName || 'node')

  if (attrs) {
    Object.keys(attrs).forEach(attrKey => {
      node.setAttribute(attrKey, attrs[attrKey])
    })
  }
}



// export class NodeSource implements NodeStream {
//   constructor (private tagName: string, private attrs?: {[key: string]: string}) { }

//   run (sink: Sink<Node>, scheduler: Scheduler) {

//     const attrs = this.attrs
//     const node = document.createElement(this.tagName || 'node')

//     if (attrs) {
//       Object.keys(attrs).forEach(attrKey => {
//         node.setAttribute(attrKey, attrs[attrKey])
//       })
//     }

//     sink.event(scheduler.currentTime(), node)

//     return new DisposeNode(node)
//   }
// }

// export class TextNodeSource implements Stream<Text> {
//   constructor (private text: string) { }

//   run (sink: Sink<Text>, scheduler: Scheduler) {
//     const node = document.createTextNode(this.text)

//     sink.event(scheduler.currentTime(), node)

//     // return { dispose () {}}
//     return new DisposeNode(node)
//   }
// }
