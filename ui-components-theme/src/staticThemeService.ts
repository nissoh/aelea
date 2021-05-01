import { Pallete, Theme } from "./types"

export const THEME_PALLETE_SELECTED_KEY = `!!THEME_PALLETE_SELECTED_KEY`



export function changeTheme<T extends Pallete>(name: string, pallete: T) {
  const newTheme = { name, pallete }
  localStorage.setItem(THEME_PALLETE_SELECTED_KEY, JSON.stringify(newTheme))
  Object.assign(theme, newTheme)
  self.location.reload()
}

export const selected = JSON.parse(localStorage.getItem(THEME_PALLETE_SELECTED_KEY)!) as Theme

if (selected === null) {
  console.error('No theme as been assigned to localstorage')
}

// validateRGBPallete(selected.pallete)

export const theme = selected
export const pallete = theme.pallete
