import type { I$Slottable } from 'aelea/core'
import { motion, styleInline } from 'aelea/core'
import { combineMap, continueWith, fromArray, now } from 'aelea/stream'

export function fadeIn($content: I$Slottable) {
  const fadeIn = motion({ stiffness: 70, damping: 26, precision: 3 }, fromArray([0, 100]))
  const slideIn = motion({ stiffness: 370, damping: 46, precision: 3 }, fromArray([15, 0]))

  const animation = combineMap(
    (state, slide) => ({
      opacity: `${state}%`,
      transform: `translate(0, ${slide}px)`
    }),
    fadeIn,
    slideIn
  )
  const withEndAnimation = continueWith(() => {
    return now({ opacity: '', transform: '' })
  })

  return styleInline(withEndAnimation(animation), $content)
}
