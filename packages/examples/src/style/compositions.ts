import { domEvent, pipe } from 'fufu'
import { constant } from '@most/core'


export const applyFocusStyle =       pipe(domEvent('focus'), constant({ borderBottom: '1px solid rgb(185, 185, 185)' }))
export const applyBlurStyle =        pipe(domEvent('blur'),  constant({ borderBottom: '1px solid rgb(210, 210, 210)' }))
