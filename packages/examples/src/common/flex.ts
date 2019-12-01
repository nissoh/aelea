import * as stylesheet from '../style/stylesheet'
import { branch, DomType, element } from 'fufu'
import { Stream } from '@most/types'
import { mergeArray } from '@most/core'


export const row =    (...children: Stream<DomType>[]) => branch(stylesheet.row(element('row')), mergeArray(children))
export const column = (...children: Stream<DomType>[]) => branch(stylesheet.column(element('column')), mergeArray(children))
