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

export const text = {
  xs: 'var(--text-xs, 0.75rem)',
  sm: 'var(--text-sm, 0.875rem)',
  base: 'var(--text-base, 1rem)',
  lg: 'var(--text-lg, 1.125rem)',
  xl: 'var(--text-xl, 1.25rem)',
  xxl: 'var(--text-xxl, 1.5rem)',
  display: 'var(--text-display, 2.25rem)'
} as const

export type TextStep = keyof typeof text

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
