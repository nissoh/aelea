
import { Scheduler, Sink, Stream, Disposable } from '@most/types'
import { disposeNone, disposeWith } from '@most/disposable'

class FromCallbackSource<Targs extends any[]> {
  constructor(private callbackFunction: (cb: (...ev: Targs) => any) => any, private context: any) { }

  run(sink: Sink<Targs>, scheduler: Scheduler): Disposable {

    // very common that callback functions returns a destructor, perhaps a Disposable in a "most" case
    const maybeDisposable = this.callbackFunction.bind(this.context)((...args) => {
      sink.event(scheduler.currentTime(), args)
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


export const fromCallback = <Targs extends any[]>(cbf: (cb: (...args: Targs) => any) => any, context: any = null): Stream<Targs> =>
  new FromCallbackSource(cbf, context)


