import type { Stream } from '@most/types'
import type { Ops } from '../../../core/types.js'

export enum InputType {
  TEXT = 'text',
  NUMBER = 'number',
  SEARCH = 'search',
  PASSWORD = 'password',
  BUTTON = 'button',
  CHECKBOX = 'checkbox',
  COLOR = 'color',
  DATE = 'date',
  TEL = 'tel',
  URL = 'url',
  HIDDEN = 'hidden',
}

export interface Control {
  disabled?: Stream<boolean>
}

export interface Input<T> extends Control {
  value: Stream<T>
  validation?: Ops<T, string | null>
}
