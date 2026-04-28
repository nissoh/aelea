/**
 * Rasterize an aelea component tree to an OG-card .webp via the takumi
 * renderer, no browser needed.
 *
 * The component is built with renderer-agnostic factories from `aelea/ui`.
 * The DOM renderer and the takumi renderer accept the same tree — the
 * choice is just which `render…` helper you call.
 *
 * Run:    bun run benchmark/og-takumi.ts
 * Output: benchmark/og-takumi.webp
 */

import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { $element, $text, attr, style } from '../src/ui/index.js'
import { renderToImage } from '../src/ui-renderer-takumi/index.js'

const pixelSrc =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/xcAAgMBgAjeRGkAAAAASUVORK5CYII='

const cardStyle = style({
  width: '1000px',
  padding: '48px',
  borderRadius: '28px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
  color: '#e8f0ff',
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '28px'
})

const imageStyle = style({
  width: '180px',
  height: '180px',
  borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.14)',
  backgroundColor: '#f2555a'
})

const rootStyle = style({
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#0b1220',
  backgroundImage:
    'radial-gradient(circle at 22% 24%, rgba(31,58,95,0.9), rgba(11,18,32,0.85) 40%, rgba(11,18,32,0.6))',
  fontFamily: 'Inter, system-ui, sans-serif'
})

const $App = $element('div')(rootStyle)(
  $element('div')(cardStyle)(
    $element('img')(imageStyle, attr({ src: pixelSrc, width: 180, height: 180 }))(),
    $element('div')(style({ display: 'flex', flexDirection: 'column', gap: '12px' }))(
      $element('div')(style({ fontSize: '56px', fontWeight: 700 }))($text('Aelea UI')),
      $element('div')(style({ fontSize: '26px', color: 'rgba(232,240,255,0.78)', maxWidth: '640px' }))(
        $text('Streams → takumi → shareable images')
      )
    )
  )
)

const bytes = await renderToImage($App, {
  width: 1200,
  height: 630,
  format: 'webp'
})

const outPath = resolve(process.cwd(), 'benchmark/og-takumi.webp')
writeFileSync(outPath, bytes)
console.log(`OG image saved to ${outPath} (${bytes.byteLength} bytes)`)
