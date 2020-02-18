import * as stylesheet from '../style/stylesheet'
import {pipe, customElement} from 'fufu'


export const row = pipe(customElement('row'), stylesheet.row)
export const column = pipe(customElement('column'), stylesheet.column)
