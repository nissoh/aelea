
export interface GDAXTick {
  maker_order_id: string   // "c560b34f-7b8e-4517-9a7e-277826b2ead3"
  price: string            // "8394.61000000"
  product_id: string       // "BTC-USD"
  sequence: number         // 5505358181
  side: string             // "sell"
  size: string             // "0.09760000"
  taker_order_id: string   // "9ef6616f-cefb-438d-84ae-9a8f996ae2bb"
  time: string             // "2018-03-26T07:43:51.618000Z"
  trade_id: number         // 40405648
  type: string             // "match"
}

export interface BinanceEvent {
  s: string                //  "BNBBTC",     Symbol
  E: number                //  123456789,    Event time
  e: string                //  "aggTrade",   Event type
}
export interface BinanceTick extends BinanceEvent {
  // p: string                //  "0.001",      Price
  // a: string                //  12345,        Aggregate trade ID
  // f: string                //  100,          First trade ID
  // T: number                //  123456785,    Trade time
  // m: string                //  true,         Is the buyer the market maker?
  // M: string                //  true          Ignore.

  v: string                //  "10000"       Total traded base asset volume

  s: string                //  "BNBBTC"      Symbol

  l: string                //  105,          Low price
  h: string                //  "0.0010",     High price
  o: string                //  "0.0010",     Open price

  c: string                //  "0.0025",     Current day's close price
  q: string                //  "100",        Quantity
}




export type TickerMap = { [key: string]: BinanceTick }



export enum ExpertType {
  Analyst = 1,
  Blogger = 3,
  Insider = 7
}

export enum Benchmark {
  None = 1,
  SNP = 2,
  Sector = 3
}

export enum Period {
  OneMonth = 1,
  ThreeMonths = 2,
  OneYear = 3,
  TwoYears = 4
}

export enum Sector {
  AllSectors = 'allSectors',
  BasicMaterials = 6,
  ConsumerGoods = 3,
  Financial = 9,
  Healthcare = 1,
  IndustrialGoods = 8,
  Services = 4,
  Technology = 7,
  Utilities = 5
}

export type TRItem = {
  uuid: string                  //  "69a8b6a82d6392485c954dc22f529f6b65095686"
  name: string                  // "Neena Mishra"
  companyName: string           // "Zillow Group Inc"
  img: string                   // "_tsqr.jpg"
  rating: string                // "Buy"
  stockTicker: string           // "PSA"
  ratingDate: string            // ""2017-11-03T00:00:00"
  expertTypeId: ExpertType
}



export type Trending = {
  buy: string                   // 5
  companyName: string           // 'Mellanox'
  consensusScore: number        // 1
  hold: number                  // 0
  lastRatingDate: string        // '2018-04-17T00:00:00'
  marketCap: number             // 4034084800
  operations: any               // null
  popularity: number            // 5
  priceTarget: number           // 87.56
  priceDiff: number             // 87.56
  quarterlyTrend: number        // 5
  rating: number                // 5
  sector: string                // 'CONSUMER GOODS'
  sectorID: number              // 18731
  sell: number                  // 0
  sentiment: number             // 5
  ticker: string
  price: string

  insiders: any                 // 'MLNX'
  topAnalysts: any              // 'MLNX'
}




export interface Concensus {
  consensus: string,
  rawConsensus: 4,
  distribution: { buy: 1, hold: 0, sell: 0 }
}

export interface PortfolioItem {
  analystConsensus: Concensus
  bestAnalystConsensus: Concensus
  consensus: string
  distribution: { buy: 1, hold: 0, sell: 0 }
  rawConsensus: 4
  bestPriceTarget: null
  bloggerSentimentData: { ratingIfExists: 1, rating: 1, bearishCount: 1, bullishCount: 4 } | null
  companyName: string
  dividend: null
  dividendYield: null
  expenseRatio: null
  hedgeFundSentimentData: { rating: number, score: number }
  high52Wdeeks: null
  insiderSentimentData: { rating: number, stockScore: number }
  landmarkPrices: { yearToDate: { date: string, d: string, p: 4.05 } }
  lastReportedEps: null
  low52Weeks: null
  marketCap: null
  newsSentiment: 0
  nextDividendDate: null
  nextEarningsReport: null
  peRatio: null
  priceTarget: null
  sectorId: string
  shouldAddLinkToStockPage: true
  stockId: 69829
  stockType: string
  stockUid: string
  ticker: string
}


