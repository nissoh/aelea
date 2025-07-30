import type { Disposable } from './types.js'

/**
 * A no-op disposable that does nothing when disposed.
 * Useful as a default or placeholder disposable.
 */
export const disposeNone: Disposable = { [Symbol.dispose]: () => undefined }
