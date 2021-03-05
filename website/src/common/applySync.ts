

import type { Theme } from '@aelea/ui-components-theme'

const theme: Partial<Theme> = {
  positive: '#a6f5a6',
  negative: '#ff9393',

  background: 'red',
}

localStorage.setItem(`!!AELEA_THEME_PALLETE`, JSON.stringify(theme))