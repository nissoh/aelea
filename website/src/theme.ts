import { loadTheme } from "@aelea/ui-components-theme";

const domLoad = loadTheme()

export const theme = domLoad.theme
export const pallete = theme.pallete
export const themeList = domLoad.themeList