// @ts-ignore
import {} from 'global.d.ts'

import { runBrowser } from '@aelea/core'
import $Website, { $main } from './pages/$Website'


runBrowser({ rootNode: document.body })(
  $main(
    $Website({ baseRoute: 'aelea' })({})
  )
)