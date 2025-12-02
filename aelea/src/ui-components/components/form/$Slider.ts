import { map } from '@/stream'
import type { IBehavior } from '@/stream-extended'
import { pallete } from '@/ui-components-theme'
import type { INode, IStyleCSS } from '@/ui-renderer-dom'
import { $element, attr, component, effectProp, nodeEvent, style, stylePseudo } from '@/ui-renderer-dom'
import type { Input } from './types.js'

export interface Slider extends Input<number> {
  step?: number
}

export const $Slider = ({ value, step = 0.01 }: Slider) =>
  component(([change, changeTether]: IBehavior<INode<HTMLInputElement>, number>) => {
    const sliderThunmbStyle: IStyleCSS = {
      backgroundColor: pallete.primary,
      borderRadius: '50%',
      width: '25px',
      height: '25px',
      appearance: 'none',
      cursor: 'grab'
    }

    return [
      $element('input')(
        style({
          width: '100%',
          height: '3px',
          margin: '0',
          transition: 'opacity .2s',
          appearance: 'none',
          outline: 'none',
          background: pallete.message
        }),
        stylePseudo('::-webkit-slider-thumb', sliderThunmbStyle),
        // stylePseudo('::-moz-range-thumb', sliderThunmbStyle),
        changeTether(
          nodeEvent('input'),
          map((evt: Event) => {
            const target: HTMLInputElement = evt.target! as any
            return Number(target.value)
          })
        ),
        attr({ type: 'range', min: 0, max: 1, step }),
        effectProp('value', value)
      )(),
      { change }
    ]
  })
