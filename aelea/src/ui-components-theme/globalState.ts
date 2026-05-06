import type { Theme } from './types.js'

export const palette = {
  foreground: 'var(--foreground)',
  middleground: 'var(--middleground)',
  background: 'var(--background)',
  horizon: 'var(--horizon)',
  message: 'var(--message)',
  primary: 'var(--primary)',
  positive: 'var(--positive)',
  negative: 'var(--negative)',
  indeterminate: 'var(--indeterminate)'
}

export const theme: Theme = {
  name: 'default',
  palette: palette
}

export const themeList: Theme[] = []

export function writeTheme(nextThemeList: Theme[], nextTheme: Theme) {
  Object.assign(theme, nextTheme)
  themeList.length = 0
  themeList.push(...nextThemeList)
}
