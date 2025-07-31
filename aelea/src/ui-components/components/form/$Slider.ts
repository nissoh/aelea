import { filter, map, merge, now, switchLatest, tap } from '../../../stream/index.js'
import type { IBehavior } from '../../../core/combinator/behavior.js'
import type { IStyleCSS } from '../../../core/combinator/style.js'
import { $element, attr, component, nodeEvent, o, style, stylePseudo } from '../../../core/index.js'
import type { INode } from '../../../core/source/node.js'
import { pallete } from '../../../ui-components-theme/globalState.js'
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
          map((evt) => {
            const target: HTMLInputElement = evt.target! as any
            return Number(target.value)
          })
        ),
        attr({ type: 'range', min: 0, max: 1, step }),

        o(
          map((node) =>
            merge(
              now(node),
              filter(
                () => false,
                tap((val) => {
                  // applying by setting `HTMLInputElement.value` imperatively(only way known to me)
                  node.element.value = String(val)
                }, value)
              )
            )
          ),
          switchLatest
        )
      )(),
      { change }
    ]
  })
