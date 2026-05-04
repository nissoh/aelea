import type { Theme } from './types.js'

// `palette` values are CSS variable references, not hex strings. Theme switches
// only need to swap the `<body>` class; CSS resolves `var(--…)` to whichever
// theme stylesheet is active. This means class-hashed rules built at module
// load (e.g. `style({ color: palette.foreground })`) update reactively without
// any JS-side mutation.
//
// The actual hex values per theme live in CSS (`<style id="aelea-theme-config">`)
// and on `theme.palette` for code that needs the literal values (theme picker
// swatches, palette previews).
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
  // Update the `theme` record so consumers reading literal values (e.g. the
  // picker reading `theme.name` for cycling) reflect the active theme. The
  // runtime `palette` is CSS-var-based and intentionally not touched.
  Object.assign(theme, nextTheme)

  themeList.length = 0
  themeList.push(...nextThemeList)
}
