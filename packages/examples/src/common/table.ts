import {style, branch, node, text, domEvent, component} from 'fufu'
import {compose} from '@most/prelude'
import {DomStream, NodeStream} from '../../../core/src/types'
import {mergeArray, merge, map, switchLatest, chain} from '@most/core'
import {Stream} from '@most/types'
import {$column, $row} from './flex'
import {pipe} from '../utils'


function beautifyNumber(x: number): string {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const tableCellStyle = style({overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '150px', height: '30px'})

const tableItemStyle = compose(tableCellStyle, style({color: 'rgba(255, 255, 255, 0.26)', fontSize: '15px'}))

function cellValue(x: any): string {

  const tx = typeof x

  if (tx === 'number') {
    return beautifyNumber(x)
  }

  if (tx === 'string') {
    return x
  }

  return ''
}

export const tableCell = compose(branch(tableItemStyle(style({color: 'rgba(255, 255, 255, 0.26)', paddingBottom: '20px'}, node))), $row)
export const applyTxt = compose(tableCell, text)

function tableItem<T>(obj: T, opts: TableOption<T>[]) {
  return opts.map(k => tableCell(k.template(obj)))
}

// function tableHeader <T> (opts: Array<TableOption<T>>) {
//   const keys = opts.map(x => x.headerLabel)

//   const items = mergeArray(keys.map(k => branch(row)(
//     branch(tableItemStyle(node), text(k))
//   )))
//   return branch(style({ paddingBottom: '20px' }, row), items)
// }

interface TableOption<T> {
  id: keyof T
  headerLabel: string
  template: (x: T) => DomStream
}

interface TableInput<T> {
  id: keyof T
  headerLabel?: string
  template?: (x: T) => NodeStream
}

type TableInputs<T> = TableInput<T>[]



function table<T>(dataStream: Stream<T[]>, inputOptions: TableInputs<T>) {

  const options: TableOption<T>[] = inputOptions.map(inputOpt => {
    return <TableOption<T>>{
      id: inputOpt.id,
      headerLabel: inputOpt.headerLabel || inputOpt.id,
      template: inputOpt.template || (data => text(cellValue(data[inputOpt.id])))
    }
  })


  const actions = {
    fufu: pipe(domEvent('click'), map(mouseEvent => {
      if (mouseEvent.currentTarget instanceof HTMLElement) {
        return mouseEvent.currentTarget.textContent
      }
    }))
  }


  return component(actions, ({fufu}) => {

    const columns = map(data => mergeArray(options.map(x =>
      style({margin: '0 16px'}, $column(
        fufu.attach(applyTxt(x.headerLabel)),
        ...data.map(i => tableCell(x.template(i)))
      ))
    )), dataStream)

    return merge(
      chain(x => branch(style({color: 'white'}, node), text(x + '')), fufu),
      style({padding: '20px'}, $row(
        switchLatest(columns)
      ))
    )
  })
}


export {table, TableInputs, TableInput, TableOption}

