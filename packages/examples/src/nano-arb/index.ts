
import { node, branch, text, style, component, domEvent } from 'fufu'

import { merge, mergeArray, combineArray, map, at, constant, chain } from '@most/core'
import { newDefaultScheduler } from '@most/scheduler'

import { xForver, runSink, pipe } from '../utils'
import * as stylesheet from '../style/stylesheet'
import { Trending, PortfolioItem } from './types'
import { trending, groupMapBy, insiderStream, analystStream, portfolioQuery } from './tipranks'
import { table, TableInputs } from './../common/table'
import data from './data'


const column = stylesheet.column(node)
const row = stylesheet.row(node)



const tableOptions: TableInputs<Trending> = [
  {
    id: 'ticker',
    headerLabel: 'Stock',
    template: (xx: Trending) => branch(column)(
      merge(
        branch(style({ color: '#ffffff9e' }, node))(text(xx.ticker)),
        branch(style({ fontSize: '11px' }, node))(text(xx.companyName))
      )
    )
  },
  {
    id: 'price',
    template: (xx: Trending) => branch(column)(
      merge(
        branch(style({ color: '#ffffff9e' }, node))(text(xx.priceDiff + '%')),
        branch(style({ fontSize: '11px' }, node))(text(xx.price))
      )
    )
  },
  { id: 'marketCap' },
  { id: 'sector' },
  { id: 'sentiment' },
  { id: 'insiders' },
  { id: 'topAnalysts' }
]

// ['ticker', 'companyName', 'priceTarget', 'buy', 'marketCap', 'sector', 'sentiment']

const tableDataStream = combineArray((insiders, analysts, trends) => {
  const mapInsiders = groupMapBy('stockTicker', insiders)
  const mapAnalystts = groupMapBy('stockTicker', analysts)

  return trends.map(x => {
    const idrs = mapInsiders[x.ticker]
    const ans = mapAnalystts[x.ticker]

    if (ans) {
      x.topAnalysts = ans.length
    } else {
      x.topAnalysts = 0
    }


    if (idrs) {
      x.insiders = idrs.length
    } else {
      x.insiders = 0
    }

    return x
  }).sort((x, y) => y.priceDiff - x.priceDiff)
}, [insiderStream, analystStream, trending])


const sortList = map((l: any[]) =>
  l
    .sort((x, y) => y.buy - x.buy)
  // .sort((x, y) => y.bloggerSentimentData.bearishCount - y.bloggerSentimentData.bearishCount)
)



const mapData = ({
  ticker,
  companyName,
  analystConsensus: { distribution: { buy, sell, hold } },
  hedgeFundSentimentData: { rating: HFRating, score: HFScore },
  insiderSentimentData
}: PortfolioItem) => ({
  buy, sell, hold, ticker, companyName, HFRating, HFScore, insiderRating: insiderSentimentData && insiderSentimentData.rating
})

branch(xForver(document.body))(
  branch(style({ fontSize: '18px', backgroundColor: '#3c4240', overflow: 'auto' }, stylesheet.main(node)))(
    branch(style({ justifyContent: 'center' }, row))(mergeArray([
      table(sortList(map(x => x.map(mapData), portfolioQuery(data))), [
        {
          id: 'ticker',
          headerLabel: 'Stock',
          template: (xx) => branch(column)(
            merge(
              branch(style({ color: '#ffffff' }, node))(text(xx.ticker)),
              branch(style({ fontSize: '11px' }, node))(text(xx.companyName))
            )
          )
        },
        { id: 'buy' },
        { id: 'hold' },
        { id: 'sell' },
        { id: 'HFRating' },
        { id: 'insiderRating' }
      ])
    ]))
  )
)

// const a1 = at(1, 'ee')
// const a2 = pipe(domEvent('click'), constant(1))

// component(({ wakka }) => {

//   return branch(xForver(document.body))(
//     branch(node)(
//       wakka.attach(text('eee'))
//       // wakka.attach(text('egerger'))
//       // map(text, observeString)
//     )
//   )
// }, {
//   wakka: x => {
//     console.log(x)
//     return a1
//   }
// })

// .run(runSink, newDefaultScheduler())

