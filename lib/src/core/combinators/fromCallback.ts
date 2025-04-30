
import { Scheduler, Sink, Stream, Disposable } from '@most/types'
import { disposeNone, disposeWith } from '@most/disposable'
import { tryEvent } from '../common'

class FromCallbackSource<T, Targs extends any[] = T[]> {
  constructor(private callbackFunction: (cb: (...ev: Targs) => any) => any, private mapFn: (...args: Targs) => T, private context: any) { }

  run(sink: Sink<T>, scheduler: Scheduler): Disposable {

    // very common that callback functions returns a destructor, perhaps a Disposable in a "most" case
    const maybeDisposable = this.callbackFunction.call(this.context, (...args) => {
      const time = scheduler.currentTime()
      const value = this.mapFn(...args)

      tryEvent(time, value, sink)
    })

    if (maybeDisposable instanceof Function) {
      return disposeWith(maybeDisposable, null)
    }

    if (maybeDisposable && 'dispose' in maybeDisposable && maybeDisposable?.dispose instanceof Function) {
      return maybeDisposable
    }

    return disposeNone()
  }
}


export const fromCallback = <T, FnArgs extends any[] = T[]>(cbf: (cb: (...args: FnArgs) => any) => any, mapFn: (...args: FnArgs) => T = (...args) => args[0], context: any = null): Stream<T> =>
  new FromCallbackSource(cbf, mapFn, context)


