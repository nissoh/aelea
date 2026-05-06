// Headless smoke render — proves the aelea component tree rasterizes via the
// takumi renderer without a browser. Renderer-agnostic factories from
// `aelea/ui`; only `renderToImage` is renderer-specific.
//
// Run:    bun run benchmark/render/headless-render.ts
// Output: benchmark/render/headless-render.webp

import { $element, $text, style } from '../../src/ui/index.js'
import { renderToImage } from '../../src/ui-renderer-takumi/index.js'

const $App = $element('div')(
  style({
    width: '100%',
    height: '100%',
    display: 'flex',
    gap: '8px',
    padding: '24px',
    color: 'tomato',
    backgroundColor: '#0b1220',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '48px',
    alignItems: 'center'
  })
)($element('span')($text('Hello')), $element('span')($text('headless renderer')))

const bytes = await renderToImage($App, {
  width: 800,
  height: 200,
  format: 'webp'
})

const outPath = `${import.meta.dir}/headless-render.webp`
await Bun.write(outPath, bytes)
console.log(`headless render → ${outPath} (${bytes.byteLength} bytes)`)
