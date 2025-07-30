import type { IStream } from '../types.js'

export const never: IStream<never> = () => ({
  [Symbol.dispose]: () => undefined
})
