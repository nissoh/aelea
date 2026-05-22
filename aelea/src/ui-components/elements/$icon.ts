import { type IOps, type IStream, map, o } from '../../stream/index.js'
import { isStream } from '../../stream/utils/common.js'
import type { I$Node, INode } from '../../ui-renderer-dom/index.js'
import { $svg, attr, style, styleBehavior } from '../../ui-renderer-dom/index.js'

export interface I$Icon {
  size?: string
  width?: string
  height?: string
  viewBox?: string
  fill?: string | IStream<string>
  $content: I$Node
  svgOps?: IOps<INode<SVGSVGElement>>
}

export const $icon = ({
  $content,
  size,
  width = size ?? '24px',
  height = size,
  viewBox = '0 0 32 32',
  fill = 'inherit',
  svgOps = o()
}: I$Icon) =>
  $svg('svg')(
    attr({ viewBox }),
    style({ width, ...(height ? { height } : { aspectRatio: '1 / 1' }) }),
    isStream(fill) ? styleBehavior(map(f => ({ fill: f }), fill)) : style({ fill }),
    svgOps
  )($content)
