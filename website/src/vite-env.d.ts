declare module 'virtual:aelea-types' {
  /** Version read from the resolved aelea package.json at build time. */
  export const aeleaVersion: string
  /** Map of aelea `.d.ts` paths (relative to dist/types, e.g. `/stream/index.d.ts`) to source. */
  export const aeleaTypes: Record<string, string>
  /** csstype `.d.ts` (e.g. `/index.d.ts`) to source — a transitive dependency of aelea/ui. */
  export const csstypeTypes: Record<string, string>
}
