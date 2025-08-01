import { disposeNone } from '../disposable.js'
import type { IStream } from '../types.js'

export const never: IStream<never> = {
  run() {
    return disposeNone
  }
}
