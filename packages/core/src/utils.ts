
import {Sink, Disposable} from '@most/types'

export const pipe = <A, B, C>(a: (a: A) => B, b: (b: B) => C) => (x: A) => b(a(x))

export const nullSink = <Sink<any>>{
  // tslint:disable-next-line:no-empty
  event(t, x) {},
  // tslint:disable-next-line:no-empty
  end(t) {},
  // tslint:disable-next-line:no-empty
  error(t, x) {}
}

export const nullDisposable = <Disposable>{
  // tslint:disable-next-line:no-empty
  dispose() {}
}
