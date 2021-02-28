// @ts-ignore
import {} from 'global.d.ts'

import { $node, runBrowser } from '@aelea/core'
import $Website, { $main } from './pages/$Website'


runBrowser({ rootNode: document.body })(
  $main(
    // $node(),
    // $node(),
    // $node(),
    $Website({ baseRoute: 'aelea' })({})
  )
)