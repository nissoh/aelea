export function convertHexToRGBA (hexCode: string, opacity = 1) {
  let hex = hexCode.replace('#', '')

  if (hex.length === 3) {
    hex = `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
  }
    
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)

  return `rgba(${r},${g},${b},${opacity / 100})`
}


const validRGB = /rgba\((\s*\d+\s*,){3}[\d.]+\)/

export function colorAlpha(color: string, opacity: number): string {
  const isRgb = validRGB.test(color)

  if (isRgb) {
    return color.replace(/[^,]+(?=\))/, String(opacity))
  } else {
    return colorAlpha(convertHexToRGBA(color), opacity)
  }
}
