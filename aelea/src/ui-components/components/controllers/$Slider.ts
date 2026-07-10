import { combine, type IStream, just, map, merge, op } from '../../../stream/index.js'
import { type IBehavior, PromiseStatus, state } from '../../../stream-extended/index.js'
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
  MOTION_SNAP,
  type MotionConfig,
  motion,
  nodeEvent,
  style,
  styleBehavior,
  styleInline,
  stylePseudo
} from '../../../ui/index.js'
import { colorWeight, palette } from '../../../ui-components-theme/index.js'
import { isDisabled, resolveDisabledState } from './form.js'
import type { Input } from './types.js'

export interface I$Slider extends Input<number> {
  min?: IStream<number>
  max?: IStream<number>
  step?: number
  orientation?: 'horizontal' | 'vertical'
  error?: IStream<boolean>
  motion?: Partial<MotionConfig> | false
  from?: number
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
  motion: motionCfg = MOTION_SNAP,
  from,
  color,
  trackColor,
  ariaLabel,
  $thumb,
  $container = $defaultSliderContainer
}: I$Slider) =>
  component(([change, changeTether]: IBehavior<INode<HTMLInputElement>, number>) => {
    const isVertical = orientation === 'vertical'

    const disabledState = op(disabled, resolveDisabledState, state())
    const blocked: IStream<boolean> = op(disabledState, map(isDisabled), state())
    const cursorStyle = op(
      disabledState,
      map(s => {
        if (typeof s === 'boolean') return s ? { cursor: 'not-allowed' } : null
        return s.status === PromiseStatus.PENDING ? { cursor: 'wait' } : null
      }),
      state()
    )

    const resolvedColor =
      color ??
      op(
        blocked,
        map(d => (d ? colorWeight(palette.foreground, 30) : colorWeight(palette.foreground, 50)))
      )
    const resolvedTrackColor =
      trackColor ??
      op(
        blocked,
        map(d => (d ? colorWeight(palette.foreground, 20) : colorWeight(palette.foreground, 40)))
      )

    const valueShared = op(value, state())
    // motion self-initializes by snapping to its first event and animating every one after, so the mount value
    // renders instantly and the first user input already tweens. Skipping the first value into motion instead
    // (the old take/skip choreography) made the FIRST input the spring's snap-init, eating its animation.
    const displayValue: IStream<number> =
      motionCfg === false
        ? valueShared
        : motion(motionCfg, from !== undefined ? merge(just(from), valueShared) : valueShared)

    const valuePercent: IStream<number> = op(
      combine({ value: displayValue, min, max }),
      map(p => {
        const range = p.max - p.min || 1
        return Math.max(0, Math.min(1, (p.value - p.min) / range))
      })
    )

    const $track = $node(
      style({
        position: 'absolute',
        ...(isVertical
          ? { top: '0', bottom: '0', left: '50%', width: '1px', transform: 'translateX(-50%)' }
          : { left: '0', right: '0', top: '50%', height: '1px', transform: 'translateY(-50%)' })
      }),
      styleInline(
        op(
          resolvedTrackColor,
          map(c => ({ background: c }))
        )
      )
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
        op(
          combine({ pct: valuePercent, color: resolvedColor }),
          map(p =>
            isVertical
              ? { background: p.color, height: `${p.pct * 100}%` }
              : { background: p.color, width: `${p.pct * 100}%` }
          )
        )
      )
    )()

    const $stateThumb = $node(
      style({
        display: 'block',
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        boxSizing: 'border-box'
      }),
      styleBehavior(
        op(
          combine({ d: blocked, e: error }),
          map(p => ({
            background: p.d ? 'transparent' : palette.background,
            border: `1.5px solid ${p.e ? palette.negative : colorWeight(palette.foreground, p.d ? 25 : 50)}`
          }))
        )
      )
    )()

    const effectiveThumb = $thumb ?? $stateThumb

    // The thumb shifts by its OWN width times the percent (not a fixed -50%), so its travel is inset by exactly one
    // thumb: flush with the container at 0% and 100% instead of overhanging by half a thumb — an overhang that gave
    // full-bleed sliders a horizontal scrollbar. Same clamping native range inputs apply, and it needs no thumb
    // measurement, so custom $thumb sizes stay correct.
    const $thumbVisual = $node(
      style({
        position: 'absolute',
        pointerEvents: 'none'
      }),
      styleInline(
        op(
          valuePercent,
          map(pct =>
            isVertical
              ? { top: `${pct * 100}%`, left: '50%', transform: `translate(-50%, -${pct * 100}%)` }
              : { left: `${pct * 100}%`, top: '50%', transform: `translate(-${pct * 100}%, -50%)` }
          )
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
      styleBehavior(cursorStyle),
      attrBehavior(
        op(
          combine({ min, max }),
          map(p => ({ min: String(p.min), max: String(p.max) }))
        )
      ),
      effectProp('disabled', blocked),
      effectProp('value', op(valueShared, map(String))),
      changeTether(
        nodeEvent('input'),
        map(ev => {
          const target = ev.target
          return target instanceof HTMLInputElement ? target.valueAsNumber : 0
        })
      )
    )()

    return [$container(styleBehavior(cursorStyle))($track, $fill, $thumbVisual, $nativeInput), { change }]
  })
