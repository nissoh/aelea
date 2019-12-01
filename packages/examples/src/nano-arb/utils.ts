import { compose } from '@most/prelude'


// study("CDC RSI Divergence", shorttitle="CDC_RSIDV")

// // Last modified 15/10/2016 //
// // Changelog : Change pctrev to atr //

// // SETTING UP VARIABLES //

// src = input(title="Data Source",type=source,defval=ohlc4)

// // RSI //
// rsiprd = input(title="RSI period",type=integer,defval=14)
// rv = rsi(src,rsiprd)
// ob = input(title="Overbought Level", type=integer, defval=70)
// os = input(title="Oversold Level", type=integer, defval=30)

// // look back periods //
// x = input(title = "short lookback period",type=integer,defval=5)
// z = input(title = "long lookback period",type=integer,defval=25)
// revatr = input(title="ATR Reversal multiplier", type=float, defval=1.618)*atr(rsiprd)
// alert = input(title="Alert period", type=integer, defval=25)

// // END SETUP //

// ////////////////////////
// // BULLISH DIVERGENCE //
// ////////////////////////

// // define lower low in price //

// srcLL = src > lowest(src,x)+revatr and  lowest(src,x)<lowest(src,z)[x]

// // define higher low in rsi //

// rsiHL = rv>lowest(rv,x) and lowest(rv,x) > lowest(rv,z)[x] and lowest(rv,x)<os

// BullishDiv = srcLL and rsiHL
// BullishDivAlert = iff(barssince(BullishDiv)<alert,10,0)+50

// ////////////////////////
// // BEARISH DIVERGENCE //
// ////////////////////////

// // define higher high in price //

// srcHH = src < highest(src,x)-revatr and  highest(src,x)>highest(src,z)[x]

// // define lower high in RSI //

// rsiLH = rv<highest(rv,x) and highest(rv,x) < highest(rv,z)[x] and highest(rv,x)>ob

// BearishDiv = srcHH and rsiLH
// BearishDivAlert = iff(barssince(BearishDiv)<alert,-10,0)+50

// zero = plot(50)
// osl = plot(30, "OS")
// obl = plot(70, "OB")
// BULLD = plot(BullishDivAlert, color = green)
// BEARD = plot(BearishDivAlert, color = red)
// fill(BULLD,zero,color=green, transp=50)
// fill(zero,BEARD,color=red, transp=50)
// plot(rv, color = teal, linewidth = 2)
// oslv = plot(rv<30 ? 20 : 30, color = gray)
// oblv = plot(rv>70 ? 80 : 70, color = gray)
// fill(osl,oslv, color=blue, transp=90)
// fill(oblv,obl, color=yellow, transp=90)



export const roundDecimal = (x: number) => Math.round(x * 100) / 100
export const getRandomFloat = (min: number, max: number) => Math.random() * (max - min) + min
export const averageFromArray = (arr: number[]) => arr.reduce((p: number, c: number) => p + c, 0) / arr.length

export const diffPercenttage = (x: number, y: number) => {
  const diff = x - y

  return diff / x * 100
}


export const formatNumber = compose(roundDecimal, Number)
export const diffPrice = (x: string, y: string) => diffPercenttage(formatNumber(x), formatNumber(y))


// const ohlc4 = (open: number, high: number, low: number, close: number) => (open + high + low + close) / 4



// function rsi (input: number, period: number) {

// }


// function calculateRSI (priceArray) {
//   let values = []
//   priceArray.forEach((entry) => {
//     if (entry.close) {
//       values.push(entry.close)
//     }
//   })
//   const inputRSI = { values, period: 14, reversedInput: true }
//   const rsiArray = (RSI.calculate(inputRSI))
//   if (values.length > 0 && rsiArray.length > 0) {
//     const priceArrayTrimmed = priceArray.slice(0, 21)
//     const rsiArrayTrimmed = rsiArray.slice(0, 21)
//     return [priceArrayTrimmed, rsiArrayTrimmed]
//   }
// }
