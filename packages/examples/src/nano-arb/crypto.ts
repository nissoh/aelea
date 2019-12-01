


import { compose } from '@most/prelude'
import { Stream, Sink } from '@most/types'
import { domEvent, node, branch } from 'fufu'

import { tap, chain, empty, merge, now, sample, combine, map, skip, filter, scan, throttle, skipRepeats, mergeArray, join } from '@most/core'
import { newDefaultScheduler } from '@most/scheduler'
import { GDAXTick, BinanceTick, TickerMap } from './types'
import { runSink } from '../utils'
import { roundDecimal, diffPercenttage } from './utils'


type Pair<T> = [T, T]



const play = (url: string) => new Audio(url).play()
const soundChaChing = () => play('http://soundbible.com/mp3/Cha_Ching_Register-Muska666-173262285.mp3')




type WSMessage<T> = MessageEvent & { data: T }

function fromWS<T> (url: string, outputStream: Stream<T> = empty()): Stream<WSMessage<T>> {

  return <Stream<WSMessage<T>>> {
    run (sink, scheduler) {
      const ws = new WebSocket(url)

      const open = domEvent('open', ws as any)

      const reads = chain(() => tap(x => sink.event(scheduler.currentTime(), x), domEvent<WSMessage<T>>('message', ws as any)), open)
      const sends = tap(x => ws.send(x as any), sample(outputStream, open)) as Stream<any>


      const lc = merge(reads, sends).run(runSink, scheduler)

      return lc
    }
  }
}


const pl = now(
  JSON.stringify({
    'type': 'subscribe', 'session_token': '48a99161dad266ed60cc8705fffbfb17efb2657bbc36d28270ef05aa37bdd23b', 'channels': [
      // {'name': 'level2_50','product_ids': ['BTC-USD']}
      // {'name': 'user','product_ids': ['BTC-USD']}
      // {'name': 'ticker_1000','product_ids': ['BTC-USD']}
      { 'name': 'matches', 'product_ids': ['BTC-USD'] }
    ]
  })
)

// function beautifySymbol(symbol: string) {
//   return sym
// }

// wss://stream.binance.com:9443/ws/!miniTicker@arr@3000ms
// wss://stream.binance.com:9443/ws/nanobtc@ticker
// const gdax = map(x => JSON.parse(x.data) as GDAXTick, skip(2, fromWS(`wss://ws-feed.gdax.com`, pl)))

const parseMessage = map((x: WSMessage<string>) => JSON.parse(x.data) as BinanceTick[])
const binance = parseMessage(fromWS(`wss://stream.binance.com:9443/ws/!miniTicker@arr@3000ms`))

const mapTicks = scan((seed, tickArray) => {
  const currMap = tickArray.reduce((map, nextTick) => ({ ...map, [nextTick.s]: nextTick }), {})
  return { ...seed, ...currMap }
}, {} as TickerMap, binance)

const limitTime = throttle(16443, mapTicks)
const pairLatest = scan(([prev, next], tick) => [next, tick], [], limitTime)

const joinInnerPairs = map(([prev, next]) => {
  if (prev && next) {
    const st = Object.keys(prev).reduce((seed, ticker) => {

      const nextTick = next[ticker]
      const prevTick = prev[ticker]

      if (ticker.indexOf('BTC') === -1 || Math.round(Number(prevTick.q)) <= Math.round(Number(nextTick.q))) {
        return seed
      }


      const body: Pair<BinanceTick> = [nextTick, prevTick]

      return [...seed, now(body)]

    }, [])

    return mergeArray(st)
  }

  return empty()
}, pairLatest)


const spikeSignalStream = join(map(([previousTick, currentTick]) => {

  const volume = Math.round(Number(currentTick.q))

  const a = Math.round(volume)
  const b = Math.round(Number(previousTick.q))

  const volumeChange = roundDecimal(diffPercenttage(a, b))

  if (
    volume > 1100                // 24hr volume is higher then 600 BTC
    && volumeChange > 2     // Volume increased by %
  ) {

    const priceChange = roundDecimal(diffPercenttage(currentTick.c, previousTick.c)) + '%'
    const timestamp = new Date(currentTick.E).toLocaleTimeString()

    return now({
      timestamp,
      priceChange,
      volumeIncrease: volumeChange + '%',
      volume,
      symbol: previousTick.s.replace('BTC', '-BTC-').split('-').join('-')
    })

  }


  return empty()
  // return change > 0.2
}, join(joinInnerPairs)))

// const pairLatest = scan(([prev, next], tick) => {

//   if (prev && next) {
//     const st = Object.keys(prev).reduce((seed, ticker) => (
//       [...seed, now([prev[ticker], next[ticker]])]
//     ), [])
//     return mergeArray(st)
//   }

//   return empty()
// }, [], limitTime)

// const gdaxBtcPrice = skipRepeats(map(x => Math.round(Number(x.price)), gdax))
// const binanceBtcPrice = skipRepeats(map(x => Number(x.c), binance))

// const nanobtc = combine((btc, nano) => roundDecimal(nano * btc), gdaxBtcPrice, binanceBtcPrice)

// const binanceNanoPrice = skipRepeats(nanobtc)


// 5ac0ef7b09e5a187fb8f6bbc
// 7ef7e055-4aca-4f6c-8c33-f4ea68ad22bd

// const headers = new Headers({
//   'KC-API-KEY': '5ac0ef7b09e5a187fb8f6bbc',
//   'KC-API-NONCE': new Date().getMilliseconds().toString(),
//   'KC-API-SIGNATURE': '7ef7e055-4aca-4f6c-8c33-f4ea68ad22bd'
// })

// fetch('https://kitchen-6.kucoin.com/v1/XRB-USDT/open/orders-buy?limit=100&group=1000&c=ZWI0MmVhLTE1MjI2NzkxNjU%3D&lang=en_US', {
//   headers
//   // cache: 'no-cache',
//   // credentials: 'same-origin',
//   // destination: 'document'
// })

// log(filter(n => Math.abs(n) > 1, s))


const log = tap(console.log)

const runEffect = compose(
  tap(state => {
    soundChaChing()
    return
  }),
  log
)

// log(filter(n => Math.abs(n) > 1, s))

const binanceSpike = runEffect(spikeSignalStream)


export { binanceSpike }
