import type { Stream } from '@most/types'
import type { IOps } from '../../../core/common.js'

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
  HIDDEN = 'hidden'
}

export interface Control {
  disabled?: Stream<boolean>
}

export interface Input<T> extends Control {
  value: Stream<T>
  validation?: IOps<T, string | null>
}
