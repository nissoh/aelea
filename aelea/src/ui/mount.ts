import { disposeNone, disposeWith, type IStream } from '../stream/index.js'
import { stream } from '../stream-extended/index.js'

export interface IMountPort<TElement = unknown> {
  element(): TElement | null
  onElement(callback: (element: TElement) => void): Disposable
  /** Renderer-only: bind the port to the element it mounted. */
  resolve(element: TElement): void
}

/**
 * Resolves once, to the element a renderer materialized for a node instance.
 * Callback form rather than a stream: attachment stays synchronous with
 * resolution, so a listener exists before the mount microtask ends.
 */
export class MountPort<TElement = unknown> implements IMountPort<TElement> {
  private el: TElement | null = null
  private callbacks: ((element: TElement) => void)[] | null = null

  element(): TElement | null {
    return this.el
  }

  onElement(callback: (element: TElement) => void): Disposable {
    if (this.el !== null) {
      callback(this.el)
      return disposeNone
    }
    const callbacks = (this.callbacks ??= [])
    callbacks.push(callback)
    return disposeWith(() => {
      if (this.callbacks !== callbacks) return
      const i = callbacks.indexOf(callback)
      if (i > -1) callbacks.splice(i, 1)
    })
  }

  resolve(element: TElement): void {
    if (this.el !== null) return
    this.el = element
    const callbacks = this.callbacks
    this.callbacks = null
    if (callbacks !== null) {
      for (let i = 0; i < callbacks.length; i++) callbacks[i](element)
    }
  }
}

/**
 * The element a port resolves to, as a stream: emits once on resolution
 * (immediately when already mounted) and never ends.
 */
export const onMounted = <TElement>(port: IMountPort<TElement>): IStream<TElement> =>
  stream((sink, scheduler) => port.onElement(element => sink.event(scheduler.time(), element)))
