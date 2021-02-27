
declare module '*.raw.ts' {
  const contents: string
  export = contents
}


// https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/948/files
declare interface ResizeObserverEntry {
  readonly borderBoxSize: ReadonlyArray<ResizeObserverSize>;
  readonly contentBoxSize: ReadonlyArray<ResizeObserverSize>;
  readonly contentRect: DOMRectReadOnly;
  readonly target: Element;
}

declare interface ResizeObserverSize {
  readonly blockSize: number;
  readonly inlineSize: number;
}

