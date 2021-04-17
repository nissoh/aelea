
import type { Theme } from "@aelea/ui-components-theme"


export const light: Theme = {
  name: 'light',
  pallete: {
    primary: '#f00',

    message: '#000000',
    description: '#616058',

    background: '#e8dab4',
    horizon: '#ded7cb',
    middleground: '#fff5de',
    foreground: '#80600d',

    positive: '#6bc36b',
    negative: '#e07070',
    indeterminate: '#c5bd61',
  }
}
export const dark: Theme = {
  name: 'dark',
  pallete: {
    primary: '#ea607e',

    message: '#ffffff',
    description: '#a5b6bd',

    background: '#1e282b',
    horizon: '#50676f',
    middleground: '#2d363a',
    foreground: '#a5b6bd',

    positive: '#a6f5a6',
    negative: '#de3434',
    indeterminate: '#dccb07',
  }
}


