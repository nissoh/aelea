/**
 * Global type declarations for the stream library
 * Defines Symbol.dispose for environments without @types/node
 */

declare global {
  interface SymbolConstructor {
    readonly dispose: unique symbol
  }

  interface Disposable {
    [Symbol.dispose](): void
  }
}

// This is needed to make this file a module
export {}
