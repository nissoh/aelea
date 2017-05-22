
export const button = {
  outline: 0,
  border: 0,
  cursor: 'pointer'
}

export const countBtn = {
  ...button,
  backgroundColor: 'rgb(218, 218, 218)',
  borderRadius: '50%',
  padding: '15px',
  margin: '0 10px',
  fontSize: '18px'
}

export const count = {
  boxShadow: '0 0 0 1px #e2e2e2',
  padding: '10px'
}

export const computedFontSize = (n: number) => ({fontSize: `${(n + 1) * 15}px`})

export const counter = {
  padding: '15px',
  fontWeight: 100,
  textAlign: 'center'
}
