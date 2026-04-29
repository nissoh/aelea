import { combine, empty, type IStream, just, map } from '../../../stream/index.js'
import type { IBehavior } from '../../../stream-extended/index.js'
import {
  $element,
  $node,
  attr,
  attrBehavior,
  component,
  effectProp,
  type I$Node,
  type INode,
  type INodeCompose,
  nodeEvent,
  style,
  styleInline,
  stylePseudo
} from '../../../ui/index.js'
import { colorAlpha, pallete } from '../../../ui-components-theme/index.js'
import type { Input } from './types.js'

export interface ISliderParams extends Input<number> {
  min?: IStream<number>
  max?: IStream<number>
  step?: number
  orientation?: 'horizontal' | 'vertical'
  disabled?: IStream<boolean>
  color?: IStream<string>
  trackColor?: IStream<string>
  ariaLabel?: string
  $thumb?: I$Node
  $container?: INodeCompose
}

export const $defaultSliderContainer = $node(
  style({
    position: 'relative',
    cursor: 'pointer',
    minHeight: '20px'
  })
)

export const $defaultSliderThumb = $node(
  style({
    display: 'block',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    background: pallete.background,
    border: `1.5px solid ${colorAlpha(pallete.foreground, 0.5)}`,
    boxSizing: 'border-box'
  })
)()

export const $Slider = ({
  value,
  min = just(0),
  max = just(1),
  step = 0.01,
  orientation = 'horizontal',
  disabled = just(false),
  color = just(colorAlpha(pallete.foreground, 0.5)),
  trackColor = just(colorAlpha(pallete.foreground, 0.15)),
  ariaLabel,
  $thumb,
  $container = $defaultSliderContainer
}: ISliderParams) =>
  component(([change, changeTether]: IBehavior<INode<HTMLInputElement>, number>) => {
    const isVertical = orientation === 'vertical'

    const valuePercent: IStream<number> = map(p => {
      const range = p.max - p.min || 1
      return Math.max(0, Math.min(1, (p.value - p.min) / range))
    }, combine({ value, min, max }))

    const $track = $node(
      style({
        position: 'absolute',
        ...(isVertical
          ? { top: '0', bottom: '0', left: '50%', width: '1px', transform: 'translateX(-50%)' }
          : { left: '0', right: '0', top: '50%', height: '1px', transform: 'translateY(-50%)' })
      }),
      styleInline(map(c => ({ background: c }), trackColor))
    )()

    const $fill = $node(
      style({
        position: 'absolute',
        borderRadius: '999px',
        ...(isVertical
          ? { top: '0', left: '50%', width: '2px', transform: 'translateX(-50%)' }
          : { left: '0', top: '50%', height: '2px', transform: 'translateY(-50%)' })
      }),
      styleInline(
        map(
          p =>
            isVertical
              ? { background: p.color, height: `${p.pct * 100}%` }
              : { background: p.color, width: `${p.pct * 100}%` },
          combine({ pct: valuePercent, color })
        )
      )
    )()

    const $thumbVisual: I$Node = $thumb
      ? $node(
          style({
            position: 'absolute',
            pointerEvents: 'none'
          }),
          styleInline(
            map(
              pct =>
                isVertical
                  ? { top: `${pct * 100}%`, left: '50%', transform: 'translate(-50%, -50%)' }
                  : { left: `${pct * 100}%`, top: '50%', transform: 'translate(-50%, -50%)' },
              valuePercent
            )
          )
        )($thumb)
      : empty

    const $nativeInput = $element('input')(
      attr({
        type: 'range',
        step: String(step),
        ...(ariaLabel ? { 'aria-label': ariaLabel } : {})
      }),
      style({
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        margin: '0',
        padding: '0',
        opacity: '0',
        cursor: 'grab',
        ...(isVertical ? { writingMode: 'vertical-lr' } : {})
      }),
      stylePseudo(':active', { cursor: 'grabbing' }),
      attrBehavior(map(p => ({ min: String(p.min), max: String(p.max) }), combine({ min, max }))),
      effectProp('disabled', disabled),
      effectProp('value', map(String, value)),
      changeTether(
        nodeEvent('input'),
        map(ev => {
          const target = ev.target
          return target instanceof HTMLInputElement ? target.valueAsNumber : 0
        })
      )
    )()

    return [$container($track, $fill, $thumbVisual, $nativeInput), { change }]
  })
