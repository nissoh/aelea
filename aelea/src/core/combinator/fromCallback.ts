import { disposeNone, disposeWith } from '../../stream/index.js'
import type { IStream } from '../../stream/types.js'

function createFromCallbackSource<T, Targs extends any[] = T[]>(
  callbackFunction: (cb: (...ev: Targs) => any) => any,
  mapFn: (...args: Targs) => T,
  context: any
): IStream<T> {
  return {
    run(_, sink) {
      // very common that callback functions returns a destructor, perhaps a Disposable in a "most" case
      const maybeDisposable = callbackFunction.call(context, (...args: Targs) => {
        const value = mapFn(...args)

        sink.event(value)
      })

      if (maybeDisposable instanceof Function) {
        return disposeWith(maybeDisposable, null)
      }

      if (maybeDisposable && typeof maybeDisposable === 'object' && Symbol.dispose in maybeDisposable) {
        return maybeDisposable
      }

      return disposeNone
    }
  }
}

export const fromCallback = <T, FnArgs extends any[] = T[]>(
  cbf: (cb: (...args: FnArgs) => any) => any,
  mapFn: (...args: FnArgs) => T = (...args) => args[0],
  context: any = null
): IStream<T> => createFromCallbackSource(cbf, mapFn, context)
