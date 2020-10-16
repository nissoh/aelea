import { Stream } from '@most/types'
import { style, $element } from 'fufu'

import * as designSheet from './stylesheet'

export enum InputType {
  TEXT = 'text',
  NUMBER = 'number'
}

export interface Control {
  disabled?: Stream<boolean>,
}

export interface Input extends Control {
  type?: InputType
  setValue?: Stream<string>
  placeholder?: string | undefined
  name?: string
}




export const $label = $element('label')(
  designSheet.row,
  style({ alignItems: 'center', cursor: 'pointer', color: designSheet.theme.system })
)


