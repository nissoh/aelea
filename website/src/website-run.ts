
// @ts-ignore
import { } from 'global.d.ts'

import './common/applySync' // apply synchnously theme before all styles are being evaluated


import { runBrowser } from '@aelea/core'
import $Website from './pages/$Website'


runBrowser({ rootNode: document.body })(
  $Website({ baseRoute: '' })({})
)