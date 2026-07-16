import { disposeNone, disposeWith } from '../stream/index.js'

export interface IMountPort<TElement = unknown> {
  element(): TElement | null
  onElement(callback: (element: TElement) => void): Disposable
}

export class MountPort<TElement = unknown> implements IMountPort<TElement> {
  private el: TElement | null = null
  private callbacks: ((element: TElement) => void)[] | null = null

  element(): TElement | null {
    return this.el
  }

  // Callback form, not a stream: attachment must stay synchronous with
  // resolution so a listener exists before the mount microtask ends — a
  // replay-latest stream would deliver one asap hop later and open an
  // event-loss window at mount.
  onElement(callback: (element: TElement) => void): Disposable {
    if (this.el !== null) {
      callback(this.el)
      return disposeNone
    }
    const callbacks = (this.callbacks ??= [])
    callbacks.push(callback)
    return disposeWith(() => {
      // Once resolution has started the array is detached — splicing it would
      // shift entries under resolve's iteration and skip a pending callback.
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
