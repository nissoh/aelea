import { combineMap, constant, continueWith, iterate, now } from 'aelea/stream'
import type { I$Slottable } from 'aelea/ui'
import { motion, styleInline } from 'aelea/ui'

export function fadeIn($content: I$Slottable) {
  const fadeIn = motion({ stiffness: 70, damping: 26, precision: 3 }, iterate([0, 100]))
  const slideIn = motion({ stiffness: 370, damping: 46, precision: 3 }, iterate([15, 0]))

  const animation = combineMap(
    (state, slide) => ({
      opacity: `${state}%`,
      transform: `translate(0, ${slide}px)`
    }),
    fadeIn,
    slideIn
  )
  const withEndAnimation = continueWith(() => {
    return constant({ opacity: '', transform: '' }, now)
  })

  return styleInline(withEndAnimation(animation), $content)
}
