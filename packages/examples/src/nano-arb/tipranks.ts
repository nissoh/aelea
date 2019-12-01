// import { map, tap, now, fromPromise, combineArray, chain, constant } from '@most/core'
// import { compose, curry2 } from '@most/prelude'
// import { ExpertType, TRItem, Benchmark, Period, Trending, PortfolioItem } from './types'
// import { diffPercenttage } from './utils'
// import { applyStream } from './apply'




// const headers = new Headers()


// const toStore = curry2(<T>(key: string, value: T): T => {
//   localStorage.setItem(key, JSON.stringify(value))

//   return value
// })

// const fromStore = <T>(key: string): T | null => {
//   const value = localStorage.getItem(key)

//   return typeof value === 'string' ? JSON.parse(value) : null
// }


// function fetchTR<T> (path: string) {
//   const storeKey = path.split('?')[0]

//   const cache = fromStore<T>(storeKey)

//   if (cache !== null) {
//     return now(cache)
//   }

//   return fromPromise(fetch(`https://www.tipranks.com/api/${path}`, { headers })
//     .then(res => res.json())
//     .then(toStore(storeKey)))
// }



// export function portfolioQuery (tickers: string[]) {
//   return applyStream<string, PortfolioItem[]>(fetchTR, `portfolio/getPortfolioHoldingStockData/?tickers=${tickers.join(',')}`)
// }

// function liveFeedQuery ({
//   expertType = ExpertType.Analyst,
//   ranking = 5,
//   count = 500,
//   benchmark = Benchmark.None,
//   period = Period.ThreeMonths
// }) {
//   return applyStream<string, TRItem[]>(fetchTR, `liveFeeds/getTop/?benchmark=${benchmark}&notRanked=-1&experttype=${expertType}&period=${period}&ranking=${ranking}&top=${count}`)
// }

// function trendingQuery () {
//   return applyStream<string, Trending[]>(fetchTR, `stocks/gettrendingstocks/?daysago=30&which=best`)
// }

// export function tickersQuery (tickers: string[]) {
//   return applyStream<string, Trending[]>(fetchTR, `stockinfo/getdetails/?name=${tickers.join(',')}`)
// }



// const filterItems = map((items: TRItem[]) =>
//   items.filter(item =>
//     item.rating === 'Buy' // && (Date.now() - new Date(item.ratingDate).getTime()) < 4437369464
//   )
// )



// export function groupMapBy<T> (key: string, array: T[]) {
//   return array.reduce((seed, item) => {

//     const ee = (item as any)[key]
//     const items = seed[ee]

//     if (items) {
//       items.push(item)
//     } else {
//       seed[ee] = [item]
//     }

//     return seed
//   }, {} as { [k: string]: T[] })
// }

// export function mapByKey<T, K extends keyof T> (key: K, array: T[]) {

//   return array.reduce((seed, item) => {
//     seed[item[key] as any] = item

//     return seed
//   }, {} as { [k: string]: T })
// }


// export const groupByCurry = curry2(groupMapBy)




// const analystStream = liveFeedQuery({ expertType: ExpertType.Analyst })
// // const bloggerStream = liveFeedQuery(6)
// const insiderStream = filterItems(liveFeedQuery({ expertType: ExpertType.Insider, ranking: 1 }))

// const mergedFeed = combineArray((analysts, insiders) =>
//   ({ analysts, insiders })
//   , [filterItems(analystStream), filterItems(insiderStream)]
// )



// const dailyRatings = map(groupByCurry('stockTicker'), mergedFeed)
// // const stream = empty()

// const absFloor = compose(Math.abs, Math.floor)


// export const getItems = (arr: Trending[]) => {
//   const mappedArr = mapByKey('ticker', arr)
//   const tickersStream = tickersQuery(arr.map(x => x.ticker))

//   const www = tap(txs => txs.forEach(x => {
//     const itm: Trending = mappedArr[x.ticker]

//     itm.price = x.price

//     return itm.priceDiff = absFloor(diffPercenttage(Number(x.price), itm.priceTarget))
//   }), tickersStream)

//   return constant(arr, www)
// }


// const trending = chain(getItems, trendingQuery())


// export { dailyRatings, trending, insiderStream, analystStream }
