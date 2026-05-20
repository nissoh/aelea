import type { IOps, IStream } from '../../../stream/index.js'

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
  disabled?: IStream<boolean | Promise<unknown>>
}

export interface Input<T> extends Control {
  value: IStream<T>
  validation?: IOps<T, string | null>
}
