import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'

const here = dirname(fileURLToPath(import.meta.url))

const firstExisting = (paths: string[]): string | undefined => paths.find(p => existsSync(p))

function readDtsTree(root: string): Record<string, string> {
  const out: Record<string, string> = {}
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) walk(full)
      else if (entry.endsWith('.d.ts'))
        out[`/${relative(root, full).split('\\').join('/')}`] = readFileSync(full, 'utf8')
    }
  }
  walk(root)
  return out
}

// Bundles aelea's REAL .d.ts (resolved through the workspace) so the in-browser
// Monaco editor type-checks snippets against the actual API and shows real hovers,
// instead of the hand-rolled `any` stubs it used to fall back to. fs is used rather
// than require.resolve because aelea's package.json `exports` gate blocks subpath
// resolution of ./package.json.
function aeleaTypesPlugin(): Plugin {
  const VID = 'virtual:aelea-types'
  const RID = `\0${VID}`
  return {
    name: 'aelea-types',
    resolveId(id) {
      if (id === VID) return RID
    },
    load(id) {
      if (id !== RID) return
      let aeleaVersion = '0.0.0'
      let aeleaTypes: Record<string, string> = {}
      let csstypeTypes: Record<string, string> = {}
      try {
        const aeleaRoot = firstExisting([
          join(here, 'node_modules/aelea'),
          join(here, '../aelea'),
          join(here, '../node_modules/aelea')
        ])
        if (!aeleaRoot) throw new Error('aelea package not found')
        aeleaVersion = JSON.parse(readFileSync(join(aeleaRoot, 'package.json'), 'utf8')).version
        aeleaTypes = readDtsTree(join(aeleaRoot, 'dist/types'))

        const cssIndex = firstExisting([
          join(here, 'node_modules/csstype/index.d.ts'),
          join(here, '../node_modules/csstype/index.d.ts'),
          join(aeleaRoot, 'node_modules/csstype/index.d.ts')
        ])
        if (cssIndex) csstypeTypes = { '/index.d.ts': readFileSync(cssIndex, 'utf8') }
      } catch (err) {
        this.warn(`could not read real aelea types, editor falls back to stubs: ${err}`)
      }
      return `export const aeleaVersion = ${JSON.stringify(aeleaVersion)}
export const aeleaTypes = ${JSON.stringify(aeleaTypes)}
export const csstypeTypes = ${JSON.stringify(csstypeTypes)}
`
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    sourcemap: true
  },
  server: {
    port: Number(process.env.PORT) || 3000
  },
  plugins: [aeleaTypesPlugin()]
})
