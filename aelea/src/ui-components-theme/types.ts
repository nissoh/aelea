export type Action = {
  primary: string
}

export type Story = {
  message: string
}

export type Landscape = {
  foreground: string
  middleground: string
  background: string
  horizon: string
}

export type Attention = {
  positive: string
  negative: string
  indeterminate: string
}

export type Palette = Attention & Landscape & Story & Action

export type Theme = {
  name: string
  palette: Palette
}
