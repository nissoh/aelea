import 'construct-style-sheets-polyfill'
import './assignThemeSync'
// @ts-ignore
import { } from 'global.d.ts'

import { runBrowser } from '@aelea/dom'
import $Website from './pages/$Website'


runBrowser({ rootNode: document.body })(
  $Website({ baseRoute: '' })({})
)