// import {curry2, CurriedFunction2, compose} from '@most/prelude'
// import {NodeStream, ElementType, ElementStream, ElementNode} from '../types'
// import {map} from '@most/core'
// import {Stream, Sink, Scheduler, Disposable, Time} from '@most/types'
// import {Pipe} from '../utils'


// interface Attr {
//   <A extends ElementType>(attrs: IAttrProperties): (ns: NodeStream<A>) => NodeStream<A>
//   <A extends ElementType>(attrs: IAttrProperties, ns: NodeStream<A>): NodeStream<A>
// }

// interface ApplyAttr {
//   <A extends ElementType>(attrs: IAttrProperties): (ns: A) => A
//   <A extends ElementType>(attrs: IAttrProperties, ns: A): A
// }


// export type IAttrProperties = {[key: string]: string}


// export const applyAttrCurry: ApplyAttr = curry2((attrs, node) => {
//   if (attrs) {
//     Object.keys(attrs).forEach(attrKey => {
//       node.setAttribute(attrKey, attrs[attrKey])
//     })
//   }

//   return node
// })


// class AttributeSource<T extends ElementType> implements ElementStream<T> {

//   constructor(public attrs: IAttrProperties, public source: NodeStream<T>) {}

//   run(sink: Sink<ElementNode<T>>, scheduler: Scheduler): Disposable {
//     return this.source.run(new AttributeSink(sink, this.attrs), scheduler)
//   }

// }


// class AttributeSink<T extends ElementType> extends Pipe<ElementNode<T>, ElementNode<T>> implements Sink<ElementNode<T>> {

//   constructor(protected sink: Sink<ElementNode<T>>, private attrs: IAttrProperties) {
//     super(sink)
//   }

//   event(t: Time, [el, ups]: ElementNode<T>): void {
//     this.sink.event(t, [el, compose(map(applyAttrCurry(this.attrs)), ups)])
//   }
// }



// const attr: Attr = curry2((attrs, source) => {
//   if (source instanceof AttributeSource) {
//     return new AttributeSource({...source.attrs, ...attrs}, source.source)
//   }

//   return new AttributeSource(attrs, source)
// })


export {}
