
import { Sink } from '@most/types'

export const nullSink = {
  // tslint:disable-next-line:no-empty
  event (t, x) {},
  // tslint:disable-next-line:no-empty
  end (t) {},
  // tslint:disable-next-line:no-empty
  error (t, x) {}
} as Sink<any>

export const nullDisposable = {
  // tslint:disable-next-line:no-empty
  dispose () {}
}
