

import type { Theme } from '@aelea/ui-components-theme'

const theme: Partial<Theme> = {
  secondary: '#a6f5a6',
  danger: '#ff9393',

  background: 'rgb(43, 52, 55)',
}

localStorage.setItem(`!!AELEA_THEME_PALLETE`, JSON.stringify(theme))