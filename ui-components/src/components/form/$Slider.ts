import { filter, map, merge, now, switchLatest, tap } from "@most/core"
import { $element, attr, Behavior, component, IBranch, event, style, stylePseudo, StyleCSS, O } from '@aelea/core'
import { pallete } from "@aelea/ui-components-theme"
import { Input } from "./types"


export interface Slider extends Input<number> {
  step?: number
}

export const $Slider = ({ value, step = .01 }: Slider) => component((
  [change, changeTether]: Behavior<IBranch<HTMLInputElement>, number>
) => {


  const sliderThunmbStyle: StyleCSS = {
    backgroundColor: pallete.primary,
    borderRadius: '50%',
    width: '25px',
    height: '25px',
    appearance: 'none',
    cursor: 'grab'
  }


  return [
    $element('input')(
      style({ width: '100%', height: '3px', margin: '0', transition: 'opacity .2s', appearance: 'none', outline: 'none', background: pallete.message }),
      stylePseudo('::-webkit-slider-thumb', sliderThunmbStyle),
      // stylePseudo('::-moz-range-thumb', sliderThunmbStyle),
      changeTether(
        event('input'),
        map(evt => {
          const target: HTMLInputElement = evt.target! as any
          return Number(target.value)
        }),
      ),
      attr({ type: 'range', min: 0, max: 1, step }),

      O(
        map(node =>
          merge(
            now(node),
            filter(() => false, tap(val => {
              // applying by setting `HTMLInputElement.value` imperatively(only way known to me)
              node.element.value = String(val)
            }, value))
          )
        ),
        switchLatest
      )

    )(),
    { change }
  ]
})
