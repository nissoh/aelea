import { Pallete, Theme } from "./types"

export const THEME_PALLETE_SELECTED_KEY = `!!THEME_PALLETE_SELECTED_KEY`



export function changeTheme<T extends Pallete>(name: string, pallete: T) {
  const newTheme = { name, pallete }
  sessionStorage.setItem(THEME_PALLETE_SELECTED_KEY, JSON.stringify(newTheme))
  Object.assign(theme, newTheme)
  self.location.reload()
}

export const selected = JSON.parse(sessionStorage.getItem(THEME_PALLETE_SELECTED_KEY)!) as Theme

if (selected === null) {
  console.error('No theme as been assigned to sessionStorage')
}

// validateRGBPallete(selected.pallete)

export const theme = selected
export const pallete = theme.pallete
