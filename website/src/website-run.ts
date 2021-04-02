
// @ts-ignore
import { } from 'global.d.ts'

import { runBrowser } from '@aelea/core'
import $Website from './pages/$Website'


runBrowser({ rootNode: document.body })(
  $Website({ baseRoute: '' })({})
)