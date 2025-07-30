import type { IStream } from '../types.js'

export const never: IStream<never> = {
  run() {
    return {
      [Symbol.dispose]: () => undefined
    }
  }
}
