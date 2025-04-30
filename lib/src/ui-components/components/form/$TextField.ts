import type { Op } from "../../../core/types.js"
import type { StyleCSS, IBranch } from "../../../dom/types.js"
import { type Field } from "./$Field.js"


export interface TextField extends Field {
  label: string
  hint?: string
  labelStyle?: StyleCSS

  containerOp?: Op<IBranch<HTMLInputElement>, IBranch<HTMLInputElement>>
}

