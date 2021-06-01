import { Theme } from "./types"

export const THEME_PALLETE_SELECTED_KEY = `!!THEME_PALLETE_SELECTED_KEY`


function setTheme<T extends Theme>(theme: T) {
  localStorage.setItem(THEME_PALLETE_SELECTED_KEY, JSON.stringify(theme))
}

export function changeTheme<T extends Theme>(theme: T) {
  setTheme(theme)
  self.location.reload()
}

export const selected = JSON.parse(localStorage.getItem(THEME_PALLETE_SELECTED_KEY)!) as Theme

if (selected === null) {
  console.error('No theme as been assigned to sessionStorage')
}

// validateRGBPallete(selected.pallete)

export const theme = selected
export const pallete = theme.pallete
