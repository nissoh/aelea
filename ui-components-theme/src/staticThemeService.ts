
export interface Theme {
  text: string
  system: string
  primary: string
  base: string
  baseLight: string
  baseDark: string

  positive: string
  negative: string

  background: string
}


const dark: Theme = {
  text: 'rgb(255 255 255)',
  system: 'rgb(165 182 189)',
  primary: 'rgb(234 96 126)',
  base: 'rgb(201 222 230)',
  baseLight: 'rgb(74 92 99)',
  baseDark: 'rgb(43 52 55)',

  positive: '#a6f5a6',
  negative: '#ff9393',

  background: '#000000',
}

const light: Theme = {
  text: 'rgb(255 255 255)',
  system: 'rgb(165 182 189)',
  primary: 'rgb(234 96 126)',
  base: 'rgb(201 222 230)',
  baseLight: 'rgb(74 92 99)',
  baseDark: 'rgb(43 52 55)',

  positive: '#a6f5a6',
  negative: '#ff9393',

  background: '#ffffff',
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