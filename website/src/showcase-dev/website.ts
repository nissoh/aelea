
// sampleClick(event('click'))

import { runBrowser, style } from "@aelea/core";
import { $main } from "../common/common";
import $Website from "../pages/$Website";


runBrowser({ rootNode: document.body })(
  $main(style({ alignItems: 'center', margin: '0 auto', }))(
    $Website({})
  )
)

