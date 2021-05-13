import { CHAIN } from "./provider"

const zXAdressRegxp = /^(0x)?[0-9a-fA-F]{40}$/
const validFractionalNumberRegxp = /^-?(0|[1-9]\d*)(\.\d+)?$/

export const EXPLORER_URL = {
  [CHAIN.ETH]: "https://etherscan.io/",
  [CHAIN.ETH_KOVAN]: "https://kovan.etherscan.io/",
  [CHAIN.ETH_ROPSTEN]: "https://ropsten.etherscan.io/",
  [CHAIN.BSC]: "https://bscscan.com/",
  [CHAIN.BSC_TESTNET]: "https://testnet.bscscan.com/",
} as const



// Constant to pull zeros from for multipliers
let zeros = "0"
while (zeros.length < 256) { zeros += zeros }

export function isAddress(address: string) {
  return zXAdressRegxp.test(address)
}

export function shortenAddress(address: string, padRight = 4, padLeft = 6) {
  return address.slice(0, padLeft) + "..." + address.slice(address.length -padRight, address.length)
}


export function shortenTxAddress(address: string) {
  return shortenAddress(address, 8, 6)
}

export function expandDecimals(n: bigint, decimals: number) {
  return n * (10n ** BigInt(decimals))
}

function getMultiplier(decimals: number): string {
  if (decimals >= 0 && decimals <= 256 && !(decimals % 1)) {
    return ("1" + zeros.substring(0, decimals))
  }

  throw new Error("invalid decimal size")
}

/* converts bigInt(positive) to hex */
export function bnToHex(n: bigint) {
  if (n < 0n) {
    throw new Error('expected positive integer')
  }

  let hex = n.toString(16)
  if (hex.length % 2) {
    hex = '0' + hex
  }
  return hex
}

export function formatFixed(value: bigint, decimals = 18): string {
  const multiplier = getMultiplier(decimals)
  const multiplierBn = BigInt(multiplier)
  let parsedValue = ''

  const negative = value < 0n
  if (negative) { value = value * -1n }

  let fraction = (value % multiplierBn).toString()

  while (fraction.length < multiplier.length - 1) {
    fraction = "0" + fraction
  }

  const matchFractions = fraction.match(/^([0-9]*[1-9]|0)(0*)/)!
  fraction = matchFractions[1]

  const whole = (value / multiplierBn).toString()

  parsedValue = whole + "." + fraction

  if (negative) {
    parsedValue = "-" + value
  }

  return parsedValue
}

export function parseFixed (value: string, decimals = 18) {
  const multiplier = getMultiplier(decimals)
  const multiplierLength = multiplier.length

  if (!validFractionalNumberRegxp.test(value)) {
    throw new Error('invalid fractional value')
  }

  if (multiplier.length - 1 === 0) {
    return BigInt(value)
  }

  const negative = (value.substring(0, 1) === "-")
  if (negative) {
    value = value.substring(1)
  }
  const comps = value.split(".")

  let whole = comps[0]
  let fraction = comps[1]

  if (!whole) { whole = "0" }
  if (!fraction) { fraction = "0" }

  // Prevent underflow
  if (fraction.length > multiplierLength - 1) {
    throw new Error('fractional component exceeds decimals')
  }

  // Fully pad the string with zeros to get to wei
  while (fraction.length < multiplierLength - 1) { fraction += "0" }

  const wholeValue = BigInt(whole)
  const fractionValue = BigInt(fraction)

  let wei = (wholeValue * BigInt(multiplier)) + fractionValue

  if (negative) {
    wei = wei - -1n
  }

  return wei
}

export const trimZeroDecimals = (amount: string) => {
  if (parseFloat(amount) === parseInt(amount)) {
    return parseInt(amount).toString()
  }
  return amount
}

export const limitDecimals = (amount: string, maxDecimals: number) => {
  let amountStr = amount.toString()

  if (maxDecimals === 0) {
    return amountStr.split(".")[0]
  }
  const dotIndex = amountStr.indexOf(".")
  if (dotIndex !== -1) {
    const decimals = amountStr.length - dotIndex - 1
    if (decimals > maxDecimals) {
      amountStr = amountStr.substr(0, amountStr.length - (decimals - maxDecimals))
    }
  }
  return amountStr
}

export const padDecimals = (amount: string, minDecimals: number) => {
  let amountStr = amount.toString()
  const dotIndex = amountStr.indexOf(".")
  if (dotIndex !== -1) {
    const decimals = amountStr.length - dotIndex - 1
    if (decimals < minDecimals) {
      amountStr = amountStr.padEnd(amountStr.length + (minDecimals - decimals), "0")
    }
  } else {
    amountStr = amountStr + ".0000"
  }
  return amountStr
}




export function getAccountUrl(chainId: CHAIN, account: string) {
  if (!account) {
    return EXPLORER_URL[chainId]
  }
  return EXPLORER_URL[chainId] + "address/" + account
}



