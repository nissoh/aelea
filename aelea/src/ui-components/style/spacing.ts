import { style } from '../../dom/combinator/style.js'

export const spacing = {
  tiny: style({ gap: '4px' }),
  small: style({ gap: '8px' }),
  default: style({ gap: '16px' }),
  big: style({ gap: '26px' })
}
