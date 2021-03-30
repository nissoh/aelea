
export type Attention = {
  success: string
  alert: string
  warning: string
  danger: string
}

export type Theme = Attention & {
  text: string
  system: string

  foreground: string
  middleground: string
  background: string

  primary: string
  secondary: string

}


const dark: Theme = {
  foreground: 'rgb(255 255 255)',
  middleground: 'rgb(74, 92, 99)',
  background: '#a6f5a6',

  text: '#ffffff',
  system: 'rgb(165 182 189)',

  primary: 'rgb(234 96 126)',
  secondary: '#a6f5a6',

  success: 'green',
  alert: 'yellow',
  warning: 'orange',
  danger: '#ff9393',
}

// TODO finish this
const light: Theme = {
  ...dark
}


export const THEME_PALLETE_KEY = `!!AELEA_THEME_PALLETE`

export const storeTheme = <T extends Partial<Theme>>(theme: T): Theme & T => {
  const newTheme = { ...dark, ...theme }
  localStorage.setItem(THEME_PALLETE_KEY, JSON.stringify(newTheme))
  return Object.assign(theme, newTheme)
}

export const changeTheme = <T extends Partial<Theme>>(theme: T) => {
  storeTheme(theme)
  self.location.reload()
}

const themeDef = localStorage.getItem(THEME_PALLETE_KEY)

let theme: Theme

if (themeDef) {
  theme = { ...dark, ...JSON.parse(themeDef) }
} else {
  const darkModePreferance = self?.matchMedia('(prefers-color-scheme: dark)').matches

  theme = darkModePreferance ? dark : light
}


export { theme }