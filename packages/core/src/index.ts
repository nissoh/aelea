import { DomNode, NodeContainerType, NodeStream, NodeType } from './types'
import { map, chain, mergeArray } from '@most/core'
import { Scheduler, Sink, Time } from '@most/types'
import { nullSink, Pipe } from 'src/utils'
import { disposeNone } from '@most/disposable'
import { StyleRule } from 'src/combinator/style'
import { applyAttrFn } from 'src/combinator/attribute'


export * from './combinator/style'
export * from './combinator/event'
export * from './utils'
export * from './combinator/attribute'
export * from './behavior'
export * from './combinator/component'
export * from './combinator/animate'
export * from './source/node'
export * from './types'




function appendToSlot(parent: DomNode<NodeContainerType>, child: DomNode<NodeType>) {
  if (parent.element.children.length < 1) {
    parent.element.appendChild(child.element)
  } else {
    parent.element.insertBefore(child.element, parent.element.children[child.slot])
  }
}

// recusivley build children tree of sinks
export function nodeEffects(parent: DomNode<NodeContainerType>, stylesheet: CSSStyleSheet) {

  return {
    run(sink: Sink<DomNode<HTMLElement>>, scheduler: Scheduler) {

      const nodeSink = new NodeRenderSink(parent, stylesheet, scheduler, sink)
      nodeSink.disposable = mergeArray(parent.children).run(nodeSink, scheduler)

      return nodeSink
    }
  }
}



class NodeRenderSink<T extends NodeContainerType> extends Pipe<any, any> {

  disposable = disposeNone()
  childrenSinks: NodeRenderSink<T>[] = []

  effectsDisposable = disposeNone()

  constructor(
    private parent: DomNode<NodeContainerType>,
    private stylesheet: CSSStyleSheet,
    private scheduler: Scheduler,
    sink: Sink<any>
  ) {
    super(sink)
  }

  event(time: Time, node: DomNode<T>) {

    appendToSlot(this.parent, node)

    this.childrenSinks = node.children.map($child => {
      const csink = new NodeRenderSink(node, this.stylesheet, this.scheduler, this.sink)
      const disp = $child.run(csink, this.scheduler)

      csink.disposable = disp

      return csink
    })

    this.effectsDisposable = mergeArray([
      ...node.style,
      ...node.attributes.map(s =>
        map(attrs => applyAttrFn(attrs, node.element), s)
      ),
    ])
      .run(nullSink, this.scheduler)

    this.sink.event(time, node)
  }

  end(t: Time) {
    this.childrenSinks.forEach(s => {
      s.end(t)
    })
    this.sink.end(t)

    this.dispose()
  }

  error(t: Time, err: any) {
    this.sink.error(t, err)
  }

  dispose() {
    this.effectsDisposable.dispose()
    this.disposable.dispose()
  }

}


// missing adoptedStyleSheets type
declare global {
  interface Document {
    adoptedStyleSheets: CSSStyleSheet[];
  }
}


export function runAt(rootNode: NodeStream<NodeContainerType>, scheduler: Scheduler) {
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, StyleRule.stylesheet]

  const effectsSink: Sink<any> = {
    event(t, x) {

    },
    error(t, err) {
      // tslint:disable-next-line: no-console
      console.error(err)
    },
    end(t) {

    }
  }

  return chain(root => nodeEffects(root, StyleRule.stylesheet), rootNode).run(effectsSink, scheduler)
}
