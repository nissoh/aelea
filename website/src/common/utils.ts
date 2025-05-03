// const rgb = getAverageRGB(document.getElementById('i'))
// document.body.style.backgroundColor = 'rgb('+rgb.r+','+rgb.g+','+rgb.b+')'

export function imageAverageColor(imgEl: HTMLImageElement) {
  const blockSize = 5 // only visit every 5 pixels
  const defaultRGB = { r: 0, g: 0, b: 0 } // for non-supporting envs
  const canvas = document.createElement('canvas')
  const context = canvas.getContext?.('2d')

  const rgb = { r: 0, g: 0, b: 0 }

  if (!context) {
    return defaultRGB
  }

  const height = (canvas.height = imgEl.naturalHeight || imgEl.offsetHeight || imgEl.height)
  const width = (canvas.width = imgEl.naturalWidth || imgEl.offsetWidth || imgEl.width)

  context.drawImage(imgEl, 0, 0)

  const data = context.getImageData(0, 0, width, height)

  let count = 0
  let i = -4
  while ((i += blockSize * 4) < data.data.length) {
    ++count
    rgb.r += data.data[i]
    rgb.g += data.data[i + 1]
    rgb.b += data.data[i + 2]
  }

  // ~~ used to floor values
  rgb.r = ~~(rgb.r / count)
  rgb.g = ~~(rgb.g / count)
  rgb.b = ~~(rgb.b / count)

  return rgb
}
