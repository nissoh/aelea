
import { Scheduler, Sink, Stream, Disposable } from '@most/types'
import { disposeNone, disposeWith } from '@most/disposable'

// copied & modified from https://github.com/mostjs/x-animation-frame/tree/master
class FromCallbackSource<T> {
  constructor(private callbackFunction: (cb: (ev: T) => any) => any, private context: any) { }

  run(sink: Sink<T>, scheduler: Scheduler): Disposable {

    // very common that callback functions returns a destructor, perhaps a Disposable in a "most" realm
    const maybeDisposable = this.callbackFunction.bind(this.context)((ev) => {
      sink.event(scheduler.currentTime(), ev)
    })

    if (maybeDisposable instanceof Function) {
      return disposeWith(maybeDisposable, null)
    }

    if ('dispose' in maybeDisposable && maybeDisposable?.dispose instanceof Function) {
      return maybeDisposable
    }

    return disposeNone()
  }
}


export const fromCallback = <T>(cbf: (cb: (ev: T) => any) => any, context: any = null): Stream<T> =>
  new FromCallbackSource(cbf, context)


