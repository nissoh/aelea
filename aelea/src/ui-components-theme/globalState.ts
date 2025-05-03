import type { Theme } from './types.js'

export const pallete = {
  foreground: '#000000',
  middleground: '#FFFFFF',
  background: '#F0F0F0',
  horizon: '#CCCCCC',
  message: 'red',
  primary: '#007BFF',
  positive: '#28A745',
  negative: '#DC3545',
  indeterminate: '#FFC107'
}

export const theme: Theme = {
  name: 'default',
  pallete: pallete
}

export const themeList: Theme[] = []

export function writeTheme(nextThemeList: Theme[], nextTheme: Theme) {
  Object.assign(theme, nextTheme)
  Object.assign(pallete, nextTheme.pallete)

  themeList.length = 0
  themeList.push(...nextThemeList)
}
