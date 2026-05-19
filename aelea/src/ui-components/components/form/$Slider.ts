import { combine, type IStream, just, map, merge, skip, take } from '../../../stream/index.js'
import { type IBehavior, multicast } from '../../../stream-extended/index.js'
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
  motion,
  type MotionConfig,
  MOTION_NO_WOBBLE,
  nodeEvent,
  style,
  styleBehavior,
  styleInline,
  stylePseudo
} from '../../../ui/index.js'
import { colorWeight, palette } from '../../../ui-components-theme/index.js'
import type { Input } from './types.js'

export interface ISliderParams extends Input<number> {
  min?: IStream<number>
  max?: IStream<number>
  step?: number
  orientation?: 'horizontal' | 'vertical'
  disabled?: IStream<boolean>
  error?: IStream<boolean>
  motion?: Partial<MotionConfig> | false
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
    background: palette.background,
    border: `1.5px solid ${colorWeight(palette.foreground, 50)}`,
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
  error = just(false),
  motion: motionCfg = MOTION_NO_WOBBLE,
  color = just(colorWeight(palette.foreground, 50)),
  trackColor = map(d => (d ? colorWeight(palette.foreground, 20) : colorWeight(palette.foreground, 40)), disabled),
  ariaLabel,
  $thumb,
  $container = $defaultSliderContainer
}: ISliderParams) =>
  component(([change, changeTether]: IBehavior<INode<HTMLInputElement>, number>) => {
    const isVertical = orientation === 'vertical'

    const valueMc = multicast(value)
    const displayValue: IStream<number> =
      motionCfg === false ? valueMc : merge(take(1, valueMc), motion(motionCfg, skip(1, valueMc)))

    const valuePercent: IStream<number> = map(p => {
      const range = p.max - p.min || 1
      return Math.max(0, Math.min(1, (p.value - p.min) / range))
    }, combine({ value: displayValue, min, max }))

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

    const $stateThumb: I$Node = $node(
      style({
        display: 'block',
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        boxSizing: 'border-box'
      }),
      styleBehavior(
        map(
          p => ({
            background: p.d ? 'transparent' : palette.background,
            border: `1.5px solid ${p.e ? palette.negative : colorWeight(palette.foreground, p.d ? 25 : 50)}`
          }),
          combine({ d: disabled, e: error })
        )
      )
    )()

    const effectiveThumb = $thumb ?? $stateThumb

    const $thumbVisual: I$Node = $node(
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
    )(effectiveThumb)

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
      styleBehavior(map(d => (d ? { cursor: 'not-allowed' } : null), disabled)),
      attrBehavior(map(p => ({ min: String(p.min), max: String(p.max) }), combine({ min, max }))),
      effectProp('disabled', disabled),
      effectProp('value', map(String, valueMc)),
      changeTether(
        nodeEvent('input'),
        map(ev => {
          const target = ev.target
          return target instanceof HTMLInputElement ? target.valueAsNumber : 0
        })
      )
    )()

    return [
      $container(styleBehavior(map(d => (d ? { cursor: 'not-allowed' } : null), disabled)))(
        $track,
        $fill,
        $thumbVisual,
        $nativeInput
      ),
      { change }
    ]
  })
