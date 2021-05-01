import { $bnb, $btc, $eth, $xrd } from "./common"
import { Token } from "./types"



export const tokenList: Token[] = [
  { address: 'sss', $icon: $xrd, label: 'Radix', symbol: 'XRD', balance: 100000 },
  { address: 'sss', $icon: $btc, label: 'Bitcoin', symbol: 'BTC', balance: 0.5 },
  { address: 'sss', $icon: $eth, label: 'Ethereum', symbol: 'ETH', balance: 30 },
  { address: 'sss', $icon: $bnb, label: 'Binance Coin', symbol: 'BNB', balance: 30 },
  // { $icon: $usd, label: 'Gambit Dollar', symbol: 'USDG' },
  // { $icon: $usd, label: 'Binance Dollar', symbol: 'BUSD' },
]