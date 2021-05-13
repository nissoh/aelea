import { constants } from "ethers"


export const TOKENS_BSC = [
  {
    name: "Bitcoin",
    symbol: 'BTC',
    decimals: 18,
    address: "0xd19A92C0f37880CD3D19CBC8Bb2636E7051f7d89",
  },
  {
    name: "Ethereum",
    symbol: 'ETH',
    decimals: 18,
    address: "0x6E9eef21FE69894f088bf6d27Dc36aa74898BA8c",
  },
  {
    name: "Binance Coin",
    symbol: 'BNB',
    decimals: 18,
    address: constants.AddressZero,
  },
  {
    name: "USD Gambit",
    symbol: 'USDG',
    decimals: 18,
    address: '0xE14F46Ee1e23B68003bCED6D85465455a309dffF'
  },
  {
    name: "USD Binance",
    symbol: 'BUSD',
    decimals: 18,
    address: "0xae7486c680720159130b71e0f9EF7AFd8f413227"
  },
  {
    name: "Test Token",
    symbol: 'TST',
    decimals: 8,
    address: "0x341F41c455fB3E08A1078D1a9c4dAd778c41E7C4",
  }
]

