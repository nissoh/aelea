import type { I$Slottable } from 'aelea/core'
import { motion, styleInline } from 'aelea/core'
import { combine, continueWith, now } from 'aelea/stream'

export function fadeIn($content: I$Slottable) {
  const fadeIn = motion({ stiffness: 70, damping: 26, precision: 3 }, 0, now(100))
  const slideIn = motion({ stiffness: 370, damping: 46, precision: 3 }, 15, now(0))

  const removeStyle = continueWith(() => now({ opacity: null, transform: null }))

  const animation = styleInline(
    removeStyle(
      combine(
        (opacity, slide) => ({
          opacity: `${opacity}%`,
          transform: `translate(0, ${slide}px)`
        }),
        fadeIn,
        slideIn
      )
    )
  )

  return animation($content)
}
