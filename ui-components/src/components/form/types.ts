import { Op } from "@aelea/core";
import { Stream } from "@most/types"

export enum InputType {
  TEXT = 'text',
  NUMBER = 'number'
}

export interface Control {
  disabled?: Stream<boolean>,
}

export interface Input<T> extends Control {
  change: Stream<T>
  validation?: Op<T, string | null>
}
