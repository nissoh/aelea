import { curry2, disposeWith, type IStream, isStream, joinMap } from '@/stream'
import { fromCallback } from '@/stream-extended'
import type { I$Slottable, INodeElement } from '../types.js'

export type ListenerOptions = boolean | { capture?: boolean; once?: boolean; passive?: boolean }

export interface EventTargetLike<TEvent = any> {
  addEventListener(type: string, listener: (event: TEvent) => void, options?: ListenerOptions): void
  removeEventListener(type: string, listener: (event: TEvent) => void, options?: ListenerOptions): void
}

export function fromEventTarget<TEvent = any>(
  element: EventTargetLike<TEvent>,
  eventType: string,
  options: ListenerOptions = false
): IStream<TEvent> {
  return fromCallback(cb => {
    element.addEventListener(eventType, cb as unknown as (ev: TEvent) => void, options)

    return disposeWith(() => {
      element.removeEventListener(eventType, cb as unknown as (ev: TEvent) => void, options)
    })
  })
}

type INodeEventDescriptor<B extends INodeElement> = {
  $node: I$Slottable<B>
  options?: ListenerOptions
}

export interface INodeEventCurry {
  <T extends INodeElement>(eventType: string, descriptor: I$Slottable<T> | INodeEventDescriptor<T>): IStream<any>
  <T extends INodeElement>(eventType: string): (descriptor: I$Slottable<T> | INodeEventDescriptor<T>) => IStream<any>
}

export const nodeEvent: INodeEventCurry = curry2((eventType, descriptor) => {
  if (isStream(descriptor)) {
    return joinMap(ns => {
      return fromEventTarget(ns.element as EventTargetLike, eventType, { capture: true })
    }, descriptor)
  }

  return joinMap(ns => {
    return fromEventTarget(ns.element as EventTargetLike, eventType, descriptor.options)
  }, descriptor.$node)
})
