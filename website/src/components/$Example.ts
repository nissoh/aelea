
import { $Branch, component, style } from '@aelea/core';
import { $column} from '../common/common';
import { spacingBig } from '../common/stylesheet';
import { fadeIn } from './transitions/enter';


interface Example {
  file: string,
}

export default (config: Example) => (...$content: $Branch[]) => component(() => {

  return [
    fadeIn(
      $column(spacingBig, style({ placeContent: 'center flex-start', width: '650px' }))(
        ...$content
      )
    )
  ]
})

