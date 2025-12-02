/**
 * Generate an OG-style image with @takumi-rs/image-response (no browser).
 * Run: bun run benchmark/og-takumi.ts
 * Output: og-takumi.webp
 */

import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ImageResponse } from '@takumi-rs/image-response'
import { attr } from '../src/ui/combinator/attribute.js'
import { style } from '../src/ui/index.js'
import { createDomScheduler } from '../src/ui/scheduler.js'
import { $element, $text, manifestFromNode } from '../src/ui-renderer-manifest/index.js'
import { manifestToReact } from '../src/ui-renderer-manifest-react/index.js'

const width = 1200
const height = 630

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
  backgroundColor: '#f2555a',
  backgroundImage: 'linear-gradient(135deg, #ff6a6a, #f2555a)'
})

const textColumnStyle = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '12px'
})

const titleStyle = style({
  fontSize: '56px',
  fontWeight: 700
})

const subtitleStyle = style({
  fontSize: '26px',
  color: 'rgba(232,240,255,0.78)',
  maxWidth: '640px'
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
    $element('img')(
      imageStyle,
      attr({
        src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/xcAAgMBgAjeRGkAAAAASUVORK5CYII=',
        width: 180,
        height: 180
      })
    )(),
    $element('div')(textColumnStyle)(
      $element('div')(titleStyle)($text('Aelea UI')),
      $element('div')(subtitleStyle)($text('Streams → DOM → shareable images'))
    )
  )
)

const manifest = await new Promise(resolve => {
  const scheduler = createDomScheduler()
  const disp = manifestFromNode($App, scheduler).run(
    {
      event(_time, m) {
        resolve(m)
        disp?.[Symbol.dispose]?.()
      },
      error(_time, err) {
        throw err
      }
    },
    scheduler
  )
})

const tree = manifestToReact(manifest)

const response = new ImageResponse(tree, {
  width,
  height,
  format: 'webp'
})

const arrayBuffer = await response.arrayBuffer()
const outPath = resolve(process.cwd(), 'benchmark/og-takumi.webp')
writeFileSync(outPath, Buffer.from(arrayBuffer))
console.log('OG image saved to', outPath)
