import { branch, node, element, style, component, text, styleBehavior, attr  } from 'fufu'
import { column } from './flex'
import { inputStyle } from '../style/stylesheet'
import { applyBlurStyle, applyFocusStyle } from '../style/compositions'
import { pipe } from '../utils'




interface IInputOptions {
  placeholder: string
  type: 'text' | 'number' | 'input'
}



const labelStyle = style({ textTransform: 'uppercase', fontSize: '11px', color: '#9a9a9a' })



const inputLabel = pipe(text, branch(labelStyle(node)))


const inputBehaviors = {
  blur: applyBlurStyle,
  focus: applyFocusStyle
}


const bb = style({ borderBottom: '1px solid rgb(185, 185, 185)' })
const bt = style({ borderBottom: '1px solid rgb(185, 185, 185)' })



const inp = inputStyle(element('input'))
const input = component(inputBehaviors, ({ blur, focus }) => {

  const attFocus = styleBehavior(focus, focus.attach(inp))

  const attBlur = styleBehavior(blur, blur.attach(attFocus))


  return attBlur
})




export const field = (label: string, options: Partial<IInputOptions>) => {

  const attrs = {
    placeholder: options.placeholder || '',
    type: options.type || 'text',
    value: '0'
  }

  return column(
    inputLabel(label),
    attr(attrs, input)
  )
}


export const numberField = (label: string, options?: Partial<IInputOptions>) => field(label, { type: 'number', ...options })
export const emailField =  (label: string, options?: Partial<IInputOptions>) => field(label, { type: 'text', ...options })



