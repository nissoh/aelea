import React, { useEffect, useState } from 'react'

import { toast } from 'react-toastify'
import { useWeb3React } from '@web3-react/core'
import cx from "classnames";
import useSWR from 'swr'
import { ethers } from 'ethers'
import { useLocalStorage } from 'react-use'

import { IoMdSwap } from 'react-icons/io'
import { BsArrowRight } from 'react-icons/bs'
import { FaAsterisk, FaTwitter, FaTelegramPlane, FaMediumM, FaGithub } from 'react-icons/fa'

import { AreaChart, Area, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

import {
  getInjectedConnector, useEagerConnect, useInactiveListener,
  fetcher, formatAmount, formatAmountFree, numberWithCommas, parseValue,
  bigNumberify, approveTokens, usePrevious, getExplorerUrl, getAccountUrl, formatDateTime, shortenAddress
} from './Helpers'

import { getContract } from './Addresses'
import { getTokens, getWhitelistedTokens, getToken, getTokenBySymbol } from './data/Tokens'

import Reader from './abis/Reader.json'
import Token from './abis/Token.json'
import Router from './abis/Router.json'
import Vault from './abis/Vault.json'

import TokenSelector from './components/Exchange/TokenSelector'
import Tab from './components/Tab/Tab'
import Modal from './components/Modal/Modal'

export function expandDecimals(n: bigin, decimals) {
  return bigNumberify(n).mul(bigNumberify(10).pow(decimals))
}


const CHAIN_ID = 56
const USD_DECIMALS = 30
const PRECISION = expandDecimals(1, 30)
const BASIS_POINTS_DIVISOR = 10000
const SWAP_FEE_BASIS_POINTS = 20
const STABLE_SWAP_FEE_BASIS_POINTS = 10
const MARGIN_FEE_BASIS_POINTS = 10
const FUNDING_RATE_PRECISION = 1000000
const LIQUIDATION_FEE = expandDecimals(5, USD_DECIMALS)
const MAX_LEVERAGE = 50 * 10000

const DUST_USD = expandDecimals(1, USD_DECIMALS)
const DUST_BNB = "2000000000000000"

const USDG_ADDRESS = getContract(CHAIN_ID, "USDG")
const NATIVE_TOKEN_ADDRESS = getContract(CHAIN_ID, "NATIVE_TOKEN")
const THRESHOLD_REDEMPTION_VALUE = expandDecimals(993, 27) // 0.993

const SWAP = "Swap"
const LONG = "Long"
const SHORT = "Short"

const SWAP_OPTIONS = [SWAP, LONG, SHORT]

const DAY = "DAY"
const WEEK = "WEEK"
const MONTH = "MONTH"

const CHART_RANGE_OPTIONS = [DAY, WEEK, MONTH]

const DEPOSIT = "Deposit"
const WITHDRAW = "Withdraw"
const EDIT_OPTIONS = [DEPOSIT, WITHDRAW]

const { AddressZero } = ethers.constants



const replaceNativeTokenAddress = (path) => {
  if (!path) { return }

  let updatedPath = []
  for (let i = 0; i < path.length; i++) {
    let address = path[i]
    if (address === AddressZero) {
      address = NATIVE_TOKEN_ADDRESS
    }
    updatedPath.push(address)
  }

  return updatedPath
}

const getLeverage = ({ size, sizeDelta, increaseSize, collateral, collateralDelta, increaseCollateral, entryFundingRate, cumulativeFundingRate }) => {
  if (!size && !sizeDelta) { return }
  if (!collateral && !collateralDelta) { return }

  let nextSize = size ? size : bigNumberify(0)
  if (sizeDelta) {
    if (increaseSize) {
      nextSize = size.add(sizeDelta)
    } else {
      if (sizeDelta.gte(size)) {
        return
      }
      nextSize = size.sub(sizeDelta)
    }
  }

  let remainingCollateral = collateral ? collateral : bigNumberify(0)
  if (collateralDelta) {
    if (increaseCollateral) {
      remainingCollateral = collateral.add(collateralDelta)
    } else {
      if (collateralDelta.gte(collateral)) {
        return
      }
      remainingCollateral = collateral.sub(collateralDelta)
    }
  }

  if (remainingCollateral.eq(0)) { return }

  remainingCollateral = sizeDelta ? remainingCollateral.mul(BASIS_POINTS_DIVISOR - MARGIN_FEE_BASIS_POINTS).div(BASIS_POINTS_DIVISOR) : remainingCollateral
  if (entryFundingRate && cumulativeFundingRate) {
    const fundingFee = size.mul(cumulativeFundingRate.sub(entryFundingRate)).div(FUNDING_RATE_PRECISION)
    remainingCollateral = remainingCollateral.sub(fundingFee)
  }

  return nextSize.mul(BASIS_POINTS_DIVISOR).div(remainingCollateral)
}

const getTokenAddress = (token) => {
  if (token.address === AddressZero) {
    return NATIVE_TOKEN_ADDRESS
  }
  return token.address
}

const getTokenInfo = (infoTokens, tokenAddress) => {
  if (tokenAddress === NATIVE_TOKEN_ADDRESS) {
    return infoTokens[AddressZero]
  }
  return infoTokens[tokenAddress]
}

function getChartToken(swapOption, fromToken, toToken) {
  if (!fromToken || !toToken) { return }

  if (swapOption !== SWAP) { return toToken }

  if (fromToken.isUsdg && toToken.isUsdg) { return getTokens(CHAIN_ID).find(t => t.isStable) }
  if (fromToken.isUsdg) { return toToken }
  if (toToken.isUsdg) { return fromToken }

  if (fromToken.isStable && toToken.isStable) { return toToken }
  if (fromToken.isStable) { return toToken }
  if (toToken.isStable) { return fromToken }

  return toToken
}

function getPositionFee(size) {
  const afterFeeUsd = size.mul(BASIS_POINTS_DIVISOR - MARGIN_FEE_BASIS_POINTS).div(BASIS_POINTS_DIVISOR)
  return size.sub(afterFeeUsd)
}

function getLiquidationPriceFromDelta({ liquidationAmount, size, collateral, averagePrice, isLong }) {
  if (!size || size.eq(0)) { return }
  if (liquidationAmount.gt(collateral)) { return }

  const liquidationDelta = collateral.sub(liquidationAmount)
  const priceDelta = liquidationDelta.mul(averagePrice).div(size)

  if (isLong) {
    return averagePrice.sub(priceDelta)
  }

  return averagePrice.add(priceDelta)
}

function getFundingFee(data) {
  let { entryFundingRate, cumulativeFundingRate, size } = data
  if (entryFundingRate && cumulativeFundingRate) {
    return size.mul(cumulativeFundingRate.sub(entryFundingRate)).div(FUNDING_RATE_PRECISION)
  }
  return
}

function getLiquidationPrice(data) {
  let { isLong, size, collateral, averagePrice, entryFundingRate, cumulativeFundingRate, sizeDelta, collateralDelta, increaseCollateral, increaseSize } = data
  if (!size || !collateral || !averagePrice) { return }

  let nextSize = size ? size : bigNumberify(0)
  if (sizeDelta) {
    if (increaseSize) {
      nextSize = size.add(sizeDelta)
    } else {
      if (sizeDelta.gte(size)) {
        return
      }
      nextSize = size.sub(sizeDelta)
    }
  }

  let remainingCollateral = collateral
  if (collateralDelta) {
    if (increaseCollateral) {
      remainingCollateral = remainingCollateral.add(collateralDelta)
    } else {
      if (collateralDelta.gte(remainingCollateral)) {
        return
      }
      remainingCollateral = remainingCollateral.sub(collateralDelta)
    }
  }

  let marginFee = getPositionFee(size).add(LIQUIDATION_FEE)
  if (entryFundingRate && cumulativeFundingRate) {
    const fundingFee = size.mul(cumulativeFundingRate.sub(entryFundingRate)).div(FUNDING_RATE_PRECISION)
    marginFee.add(fundingFee)
  }

  const liquidationPriceForFees = getLiquidationPriceFromDelta({
    liquidationAmount: marginFee, size: nextSize, collateral: remainingCollateral, averagePrice, isLong
  })

  const liquidationPriceForMaxLeverage = getLiquidationPriceFromDelta({
    liquidationAmount: nextSize.mul(BASIS_POINTS_DIVISOR).div(MAX_LEVERAGE), size: nextSize, collateral: remainingCollateral, averagePrice, isLong
  })

  if (!liquidationPriceForFees) { return liquidationPriceForMaxLeverage }
  if (!liquidationPriceForMaxLeverage) { return liquidationPriceForFees }

  if (isLong) {
    // return the higher price
    return liquidationPriceForFees.gt(liquidationPriceForMaxLeverage) ? liquidationPriceForFees : liquidationPriceForMaxLeverage
  }

  // return the lower price
  return liquidationPriceForFees.lt(liquidationPriceForMaxLeverage) ? liquidationPriceForFees : liquidationPriceForMaxLeverage
}

function getPositionKey(collateralTokenAddress, indexTokenAddress, isLong) {
  const tokenAddress0 = collateralTokenAddress === AddressZero ? NATIVE_TOKEN_ADDRESS : collateralTokenAddress
  const tokenAddress1 = indexTokenAddress === AddressZero ? NATIVE_TOKEN_ADDRESS : indexTokenAddress
  return tokenAddress0 + ":" + tokenAddress1 + ":" + isLong
}

function getPositions(positionQuery, positionData, infoTokens) {
  const propsLength = 8
  const positions = []
  const positionsMap = {}
  if (!positionData) {
    return { positions, positionsMap }
  }
  const { collateralTokens, indexTokens, isLong } = positionQuery
  for (let i = 0; i < collateralTokens.length; i++) {
    const collateralToken = getTokenInfo(infoTokens, collateralTokens[i])
    const indexToken = getTokenInfo(infoTokens, indexTokens[i])
    const key = getPositionKey(collateralTokens[i], indexTokens[i], isLong[i])

    const position = {
      key,
      collateralToken,
      indexToken,
      isLong: isLong[i],
      size: positionData[i * propsLength],
      collateral: positionData[i * propsLength + 1],
      averagePrice: positionData[i * propsLength + 2],
      entryFundingRate: positionData[i * propsLength + 3],
      cumulativeFundingRate: collateralToken.cumulativeFundingRate,
      hasRealisedProfit: positionData[i * propsLength + 4].eq(1),
      realisedPnl: positionData[i * propsLength + 5],
      hasProfit: positionData[i * propsLength + 6].eq(1),
      delta: positionData[i * propsLength + 7],
      markPrice: isLong[i] ? indexToken.minPrice : indexToken.maxPrice
    }

    position.leverage = getLeverage({
      size: position.size,
      collateral: position.collateral,
      entryFundingRate: position.entryFundingRate,
      cumulativeFundingRate: position.cumulativeFundingRate
    })

    positionsMap[key] = position

    if (position.size.gt(0)) {
      positions.push(position)
    }
  }

  return { positions, positionsMap }
}

function getPositionQuery(tokens) {
  const collateralTokens = []
  const indexTokens = []
  const isLong = []

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (token.isStable) { continue }
    collateralTokens.push(getTokenAddress(token))
    indexTokens.push(getTokenAddress(token))
    isLong.push(true)
  }

  for (let i = 0; i < tokens.length; i++) {
    const stableToken = tokens[i]
    if (!stableToken.isStable) { continue }

    for (let j = 0; j < tokens.length; j++) {
      const token = tokens[j]
      if (token.isStable) { continue }
      collateralTokens.push(stableToken.address)
      indexTokens.push(getTokenAddress(token))
      isLong.push(false)
    }
  }

  return { collateralTokens, indexTokens, isLong }
}

function getInfoTokens(tokens, tokenBalances, whitelistedTokens, vaultTokenInfo, fundingRateInfo) {
  const vaultPropsLength = 9
  const fundingRatePropsLength = 2
  const infoTokens = {}

  for (let i = 0; i < tokens.length; i++) {
    const token = JSON.parse(JSON.stringify(tokens[i]))
    if (tokenBalances) {
      token.balance = tokenBalances[i]
    }
    if (token.address === USDG_ADDRESS) {
      token.minPrice = expandDecimals(1, USD_DECIMALS)
      token.maxPrice = expandDecimals(1, USD_DECIMALS)
    }
    infoTokens[token.address] = token
  }

  for (let i = 0; i < whitelistedTokens.length; i++) {
    const token = JSON.parse(JSON.stringify(whitelistedTokens[i]))
    if (vaultTokenInfo) {
      token.poolAmount = vaultTokenInfo[i * vaultPropsLength]
      token.reservedAmount = vaultTokenInfo[i * vaultPropsLength + 1]
      token.availableAmount = token.poolAmount.sub(token.reservedAmount)
      token.usdgAmount = vaultTokenInfo[i * vaultPropsLength + 2]
      token.redemptionAmount = vaultTokenInfo[i * vaultPropsLength + 3]
      token.minPrice = vaultTokenInfo[i * vaultPropsLength + 4]
      token.maxPrice = vaultTokenInfo[i * vaultPropsLength + 5]
      token.guaranteedUsd = vaultTokenInfo[i * vaultPropsLength + 6]
    }

    if (fundingRateInfo) {
      token.fundingRate = fundingRateInfo[i * fundingRatePropsLength];
      token.cumulativeFundingRate = fundingRateInfo[i * fundingRatePropsLength + 1];
    }

    if (infoTokens[token.address]) {
      token.balance = infoTokens[token.address].balance
    }

    infoTokens[token.address] = token
  }

  return infoTokens
}

function getSwapFeeBasisPoints(isStable) {
  return isStable ? STABLE_SWAP_FEE_BASIS_POINTS : SWAP_FEE_BASIS_POINTS
}

function getMostAbundantStableToken(infoTokens) {
  const whitelistedTokens = getWhitelistedTokens(CHAIN_ID)
  let availableAmount = bigNumberify(0)
  let stableToken
  for (let i = 0; i < whitelistedTokens.length; i++) {
    const info = getTokenInfo(infoTokens, whitelistedTokens[i].address)
    if (!info.isStable) {
      continue
    }

    if (info.availableAmount.gt(availableAmount)) {
      availableAmount = info.availableAmount
      stableToken = info
    }
  }
  return stableToken
}

function getNextToAmount(fromAmount, fromTokenAddress, toTokenAddress, infoTokens) {
  const defaultValue = { amount: bigNumberify(0) }
  if (!fromAmount || !fromTokenAddress || !toTokenAddress || !infoTokens) {
    return defaultValue
  }

  if (fromTokenAddress === toTokenAddress) {
    return { amount: fromAmount }
  }

  const fromToken = getTokenInfo(infoTokens, fromTokenAddress)
  const toToken = getTokenInfo(infoTokens, toTokenAddress)

  if (!fromToken || !toToken) { return defaultValue }

  if (toTokenAddress === USDG_ADDRESS) {
    const toAmount = fromAmount.mul(fromToken.minPrice).div(PRECISION)
    const feeBasisPoints = getSwapFeeBasisPoints(fromToken.isStable)
    return { amount: toAmount.mul(BASIS_POINTS_DIVISOR - feeBasisPoints).div(BASIS_POINTS_DIVISOR) }
  }

  if (fromTokenAddress === USDG_ADDRESS) {
    const redemptionValue = toToken.redemptionAmount.mul(toToken.maxPrice).div(expandDecimals(1, toToken.decimals))
    if (redemptionValue.gt(THRESHOLD_REDEMPTION_VALUE)) {
      const toAmount = fromAmount.mul(toToken.redemptionAmount).div(expandDecimals(1, toToken.decimals))
      const feeBasisPoints = getSwapFeeBasisPoints(toToken.isStable)
      return { amount: toAmount.mul(BASIS_POINTS_DIVISOR - feeBasisPoints).div(BASIS_POINTS_DIVISOR) }
    }

    const expectedAmount = fromAmount

    const stableToken = getMostAbundantStableToken(infoTokens)
    if (!stableToken || stableToken.availableAmount.lt(expectedAmount)) {
      const toAmount = fromAmount.mul(toToken.redemptionAmount).div(expandDecimals(1, toToken.decimals))
      const feeBasisPoints = getSwapFeeBasisPoints(toToken.isStable)
      return { amount: toAmount.mul(BASIS_POINTS_DIVISOR - feeBasisPoints).div(BASIS_POINTS_DIVISOR) }
    }

    // get toAmount for USDG => stableToken
    let toAmount = fromAmount.mul(PRECISION).div(stableToken.maxPrice)
    let feeBasisPoints = getSwapFeeBasisPoints(true)
    // apply USDG => stableToken fees
    toAmount = toAmount.mul(BASIS_POINTS_DIVISOR - feeBasisPoints).div(BASIS_POINTS_DIVISOR)

    // get toAmount for stableToken => toToken
    toAmount = toAmount.mul(stableToken.minPrice).div(toToken.maxPrice)
    // apply stableToken => toToken fees
    feeBasisPoints = getSwapFeeBasisPoints(false)
    toAmount = toAmount.mul(BASIS_POINTS_DIVISOR - feeBasisPoints).div(BASIS_POINTS_DIVISOR)

    return {
      amount: toAmount,
      path: [USDG_ADDRESS, stableToken.address, toToken.address]
    }
  }

  const toAmount = fromAmount.mul(fromToken.minPrice).div(toToken.maxPrice)
  const feeBasisPoints = getSwapFeeBasisPoints(fromToken.isStable && toToken.isStable)
  return { amount: toAmount.mul(BASIS_POINTS_DIVISOR - feeBasisPoints).div(BASIS_POINTS_DIVISOR) }
}

function getNextFromAmount(toAmount, fromTokenAddress, toTokenAddress, infoTokens) {
  const defaultValue = { amount: bigNumberify(0) }

  if (!toAmount || !fromTokenAddress || !toTokenAddress || !infoTokens) {
    return defaultValue
  }

  if (fromTokenAddress === toTokenAddress) {
    return { amount: toAmount }
  }

  const fromToken = getTokenInfo(infoTokens, fromTokenAddress)
  const toToken = getTokenInfo(infoTokens, toTokenAddress)

  if (!fromToken || !toToken) { return defaultValue }

  if (toTokenAddress === USDG_ADDRESS) {
    const fromAmount = toAmount.mul(PRECISION).div(fromToken.maxPrice)
    const feeBasisPoints = getSwapFeeBasisPoints(fromToken.isStable)
    return { amount: fromAmount.mul(BASIS_POINTS_DIVISOR + feeBasisPoints).div(BASIS_POINTS_DIVISOR) }
  }

  if (fromTokenAddress === USDG_ADDRESS) {
    const redemptionValue = toToken.redemptionAmount.mul(toToken.maxPrice).div(expandDecimals(1, toToken.decimals))
    if (redemptionValue.gt(THRESHOLD_REDEMPTION_VALUE)) {
      const fromAmount = toAmount.mul(expandDecimals(1, toToken.decimals)).div(toToken.redemptionAmount)
      const feeBasisPoints = getSwapFeeBasisPoints(toToken.isStable)
      return { amount: fromAmount.mul(BASIS_POINTS_DIVISOR + feeBasisPoints).div(BASIS_POINTS_DIVISOR) }
    }

    const expectedAmount = toAmount.mul(toToken.maxPrice).div(PRECISION)

    const stableToken = getMostAbundantStableToken(infoTokens)
    if (!stableToken || stableToken.availableAmount.lt(expectedAmount)) {
      const fromAmount = toAmount.mul(expandDecimals(1, toToken.decimals)).div(toToken.redemptionAmount)
      const feeBasisPoints = getSwapFeeBasisPoints(toToken.isStable)
      return { amount: fromAmount.mul(BASIS_POINTS_DIVISOR + feeBasisPoints).div(BASIS_POINTS_DIVISOR) }
    }

    // get fromAmount for stableToken => toToken
    let fromAmount = toAmount.mul(toToken.maxPrice).div(stableToken.minPrice)
    let feeBasisPoints = getSwapFeeBasisPoints(false)
    // apply stableToken => toToken fees
    fromAmount = fromAmount.mul(BASIS_POINTS_DIVISOR + feeBasisPoints).div(BASIS_POINTS_DIVISOR)

    // get fromAmount for USDG => stableToken
    fromAmount = fromAmount.mul(stableToken.maxPrice).div(PRECISION)
    // apply USDG => stableToken fees
    feeBasisPoints = getSwapFeeBasisPoints(true)
    fromAmount = fromAmount.mul(BASIS_POINTS_DIVISOR + feeBasisPoints).div(BASIS_POINTS_DIVISOR)

    return {
      amount: fromAmount,
      path: [USDG_ADDRESS, stableToken.address, toToken.address]
    }
  }

  const fromAmount = toAmount.mul(toToken.maxPrice).div(fromToken.minPrice)
  const feeBasisPoints = getSwapFeeBasisPoints(fromToken.isStable && toToken.isStable)
  return { amount: fromAmount.mul(BASIS_POINTS_DIVISOR + feeBasisPoints).div(BASIS_POINTS_DIVISOR) }
}

function getUsd(amount, tokenAddress, max, infoTokens) {
  if (!amount) { return }
  if (tokenAddress === USDG_ADDRESS) {
    return amount.mul(PRECISION).div(expandDecimals(1, 18))
  }
  const info = getTokenInfo(infoTokens, tokenAddress)
  if (!info) { return }
  if (max && !info.maxPrice) { return }
  if (!max && !info.minPrice) { return }

  return amount.mul(max ? info.maxPrice : info.minPrice).div(expandDecimals(1, info.decimals))
}

function getTokenAmount(usdAmount, tokenAddress, max, infoTokens) {
  if (!usdAmount) { return }
  if (tokenAddress === USDG_ADDRESS) {
    return usdAmount.mul(expandDecimals(1, 18)).div(PRECISION)
  }
  const info = getTokenInfo(infoTokens, tokenAddress)
  if (!info) { return }
  if (max && !info.maxPrice) { return }
  if (!max && !info.minPrice) { return }

  return usdAmount.mul(expandDecimals(1, info.decimals)).div(max ? info.minPrice : info.maxPrice)
}

function getNextAveragePrice({ size, sizeDelta, hasProfit, delta, nextPrice }) {
  if (!size || !sizeDelta || !delta || !nextPrice) { return }
  const nextSize = size.add(sizeDelta)
  const divisor = hasProfit ? nextSize.add(delta) : nextSize.sub(delta)
  const nextAveragePrice = nextPrice.mul(nextSize).div(divisor)
  return nextAveragePrice
}

function SwapBox(props) {
  const { infoTokens, active, library, account, chainId,
    fromTokenAddress, setFromTokenAddress, toTokenAddress, setToTokenAddress,
    swapOption, setSwapOption, positionsMap, maxUsdg, pendingTxns, setPendingTxns,
    tokenSelection, setTokenSelection } = props

  const accountUrl = getAccountUrl(chainId, account)

  const [fromValue, setFromValue] = useState("")
  const [toValue, setToValue] = useState("")
  const [anchorOnFromAmount, setAnchorOnFromAmount] = useState(true)
  const [isApproving, setIsApproving] = useState(false)
  const [isWaitingForApproval, setIsWaitingForApproval] = useState(false)
  const [isSwapping, setIsSwapping] = useState(false)
  const [shortCollateralAddress, setShortCollateralAddress] = useState(getTokenBySymbol(CHAIN_ID, "BUSD").address)
  const isLong = swapOption === LONG
  const isShort = swapOption === SHORT
  const isSwap = swapOption === SWAP
  const [leverageOption, setLeverageOption] = useLocalStorage("Exchange-swap-leverage-option", "2")
  const leverageOptions = ["2", "3", "5"]

  let positionKey
  if (isLong) {
    positionKey = getPositionKey(toTokenAddress, toTokenAddress, true)
  }
  if (isShort) {
    positionKey = getPositionKey(shortCollateralAddress, toTokenAddress, false)
  }

  const existingPosition = positionKey ? positionsMap[positionKey] : undefined
  const hasExistingPosition = existingPosition && existingPosition.size && existingPosition.size.gt(0)

  const whitelistedTokens = getWhitelistedTokens(CHAIN_ID)
  const tokens = getTokens(CHAIN_ID)
  const fromTokens = tokens
  const stableTokens = tokens.filter(token => token.isStable)
  const indexTokens = whitelistedTokens.filter(token => !token.isStable)
  const toTokens = isSwap ? tokens : indexTokens

  const routerAddress = getContract(CHAIN_ID, "Router")
  const { data: tokenAllowance, mutate: updateTokenAllowance } = useSWR([active, fromTokenAddress, "allowance", account, routerAddress], {
    fetcher: fetcher(library, Token),
  })

  const fromToken = getToken(CHAIN_ID, fromTokenAddress)
  const toToken = getToken(CHAIN_ID, toTokenAddress)
  const shortCollateralToken = getTokenInfo(infoTokens, shortCollateralAddress)

  const fromTokenInfo = getTokenInfo(infoTokens, fromTokenAddress)
  const toTokenInfo = getTokenInfo(infoTokens, toTokenAddress)

  const fromBalance = fromTokenInfo ? fromTokenInfo.balance : bigNumberify(0)
  const toBalance = toTokenInfo ? toTokenInfo.balance : bigNumberify(0)

  const fromAmount = parseValue(fromValue, fromToken.decimals)
  const toAmount = parseValue(toValue, toToken.decimals)

  const needApproval = tokenAllowance && fromAmount && fromAmount.gt(tokenAllowance)
  const prevFromTokenAddress = usePrevious(fromTokenAddress)
  const prevNeedApproval = usePrevious(needApproval)

  let entryMarkPrice
  let exitMarkPrice
  if (toTokenInfo) {
    entryMarkPrice = swapOption === LONG ? toTokenInfo.maxPrice : toTokenInfo.minPrice
    exitMarkPrice = swapOption === LONG ? toTokenInfo.minPrice : toTokenInfo.maxPrice
  }

  const fromUsdMin = getUsd(fromAmount, fromTokenAddress, false, infoTokens)
  const toUsdMax = getUsd(toAmount, toTokenAddress, true, infoTokens)

  let leverage = (fromUsdMin && toUsdMax && fromUsdMin.gt(0)) ? toUsdMax.mul(BASIS_POINTS_DIVISOR).div(fromUsdMin) : bigNumberify(0)
  let nextAveragePrice = entryMarkPrice
  if (hasExistingPosition) {
    nextAveragePrice = getNextAveragePrice({
      size: existingPosition.size,
      sizeDelta: toUsdMax,
      hasProfit: existingPosition.hasProfit,
      delta: existingPosition.delta,
      nextPrice: entryMarkPrice
    })
  }

  const liquidationPrice = getLiquidationPrice({
    isLong,
    size: hasExistingPosition ? existingPosition.size : bigNumberify(0),
    collateral: hasExistingPosition ? existingPosition.collateral : bigNumberify(0),
    averagePrice: nextAveragePrice,
    entryFundingRate: hasExistingPosition ? existingPosition.entryFundingRate : bigNumberify(0),
    cumulativeFundingRate: hasExistingPosition ? existingPosition.cumulativeFundingRate : bigNumberify(0),
    sizeDelta: toUsdMax,
    collateralDelta: fromUsdMin,
    increaseCollateral: true,
    increaseSize: true
  })

  const existingLiquidationPrice = existingPosition ? getLiquidationPrice(existingPosition) : undefined
  let displayLiquidationPrice = liquidationPrice ? liquidationPrice : existingLiquidationPrice

  if (hasExistingPosition) {
    const collateralDelta = fromUsdMin ? fromUsdMin : bigNumberify(0)
    const sizeDelta = toUsdMax ? toUsdMax : bigNumberify(0)
    leverage = getLeverage({
      size: existingPosition.size,
      sizeDelta,
      collateral: existingPosition.collateral,
      collateralDelta,
      increaseCollateral: true,
      entryFundingRate: existingPosition.entryFundingRate,
      cumulativeFundingRate: existingPosition.cumulativeFundingRate,
      increaseSize: true
    })
  }

  useEffect(() => {
    if (fromTokenAddress === prevFromTokenAddress && !needApproval && prevNeedApproval && isWaitingForApproval) {
      setIsWaitingForApproval(false)
      toast.success(<div>
        {fromToken.symbol} approved!
      </div>)
    }
  }, [fromTokenAddress, prevFromTokenAddress, needApproval,
    prevNeedApproval, setIsWaitingForApproval, fromToken.symbol,
    isWaitingForApproval])

  useEffect(() => {
    if (!toTokens.find(token => token.address === toTokenAddress)) {
      setToTokenAddress(toTokens[0].address)
    }
  }, [toTokens, toTokenAddress, setToTokenAddress])

  const getSwapError = () => {
    if (fromTokenAddress === toTokenAddress) { return "Select different tokens" }
    if (!fromAmount || fromAmount.eq(0)) { return "Enter an amount" }
    if (!toAmount || toAmount.eq(0)) { return "Enter an amount" }

    const fromTokenInfo = getTokenInfo(infoTokens, fromTokenAddress)
    if (fromTokenInfo && fromTokenInfo.balance && fromAmount && fromAmount.gt(fromTokenInfo.balance)) {
      return `Insufficient ${fromTokenInfo.symbol} balance`
    }

    if (fromTokenInfo && fromTokenInfo.usdgAmount && fromTokenInfo.minPrice && toTokenAddress !== USDG_ADDRESS) {
      const usdgAmount = fromTokenInfo.minPrice.mul(fromAmount).div(PRECISION)
      const mintable = maxUsdg.sub(fromTokenInfo.usdgAmount)
      if (usdgAmount.gt(mintable)) {
        return "Max swap amount exceeded"
      }
    }

    const toTokenInfo = getTokenInfo(infoTokens, toTokenAddress)
    if (toToken && toTokenAddress !== USDG_ADDRESS && toTokenInfo &&
      toTokenInfo.availableAmount && toAmount.gt(toTokenInfo.availableAmount)) {
      return "Insufficient liquidity"
    }

    if (toToken && toTokenAddress === USDG_ADDRESS && maxUsdg && fromTokenInfo && fromTokenInfo.usdgAmount) {
      const mintable = maxUsdg.sub(fromTokenInfo.usdgAmount)
      if (toAmount.gt(mintable)) {
        let alternativeToken
        let alternativeAmount = bigNumberify(0)
        for (let i = 0; i < whitelistedTokens.length; i++) {
          const tokenInfo = getTokenInfo(infoTokens, whitelistedTokens[i].address)
          if (i === 0) {
            alternativeToken = tokenInfo
            alternativeAmount = tokenInfo.usdgAmount
            continue
          }
          if (tokenInfo.usdgAmount.lt(alternativeAmount)) {
            alternativeAmount = tokenInfo.usdgAmount
            alternativeToken = tokenInfo
          }
        }

        return `${fromTokenInfo.symbol} mint cap reached, try ${alternativeToken.symbol} instead`
      }
    }

    return false
  }

  const getLeverageError = () => {
    if (!toAmount) { return "Enter an amount" }
    const fromTokenInfo = getTokenInfo(infoTokens, fromTokenAddress)
    if (fromTokenInfo && fromTokenInfo.balance && fromAmount && fromAmount.gt(fromTokenInfo.balance)) {
      return `Insufficient ${fromTokenInfo.symbol} balance`
    }

    if (leverage && leverage.eq(0)) { return "Enter an amount" }

    if (!hasExistingPosition && fromUsdMin && fromUsdMin.lt(expandDecimals(10, USD_DECIMALS))) {
      return "Min order: 10 USD"
    }

    if (leverage && leverage.lt(1.45 * BASIS_POINTS_DIVISOR)) {
      return "Min leverage: 1.5x"
    }

    if (leverage && leverage.gt(30.5 * BASIS_POINTS_DIVISOR)) {
      return "Max leverage: 30x"
    }

    let toTokenInfo = getTokenInfo(infoTokens, toTokenAddress)
    if (isLong) {
      let requiredAmount = toAmount
      if (fromTokenAddress !== toTokenAddress) {
        const { amount: swapAmount } = getNextToAmount(fromAmount, fromTokenAddress, toTokenAddress, infoTokens)
        requiredAmount = requiredAmount.add(swapAmount)
      }
      if (toToken && toTokenAddress !== USDG_ADDRESS &&
        toTokenInfo.availableAmount && requiredAmount.gt(toTokenInfo.availableAmount)) {
        return "Insufficient liquidity"
      }
    }

    if (isShort) {
      let stableTokenAmount = bigNumberify(0)
      if (fromTokenAddress !== shortCollateralAddress && fromAmount && fromAmount.gt(0)) {
        const { amount: nextToAmount } = getNextToAmount(fromAmount, fromTokenAddress, shortCollateralAddress, infoTokens)
        stableTokenAmount = nextToAmount
        if (stableTokenAmount.gt(shortCollateralToken.availableAmount)) {
          return `Insufficient liquidity`
        }
      }
      if (!shortCollateralToken || !fromTokenInfo || !toTokenInfo || !toTokenInfo.maxPrice || !shortCollateralToken.availableAmount) {
        return "Fetching token info..."
      }

      const sizeUsd = toAmount.mul(toTokenInfo.maxPrice).div(expandDecimals(1, toTokenInfo.decimals))
      const sizeTokens = sizeUsd.mul(expandDecimals(1, shortCollateralToken.decimals)).div(shortCollateralToken.minPrice)

      stableTokenAmount = stableTokenAmount.add(sizeTokens)
      if (stableTokenAmount.gt(shortCollateralToken.availableAmount)) {
        return `Insufficient liquidity`
      }
    }

    return false
  }

  const getToLabel = () => {
    if (isSwap) { return "Receive" }
    if (isLong) { return "Long" }
    return "Short"
  }

  const getError = () => {
    if (isSwap) {
      return getSwapError()
    }
    return getLeverageError()
  }

  const isPrimaryEnabled = () => {
    if (!active) { return true }
    const error = getError()
    if (error) { return false }
    if (needApproval && isWaitingForApproval) { return false }
    if (isSwapping) { return false }

    return true
  }

  const getPrimaryText = () => {
    if (!active) { return "Connect Wallet" }
    if (chainId !== CHAIN_ID) { return "Incorrect Network" }
    const error = getError()
    if (error) { return error }
    if (needApproval && isWaitingForApproval) { return "Waiting for Approval" }
    if (isApproving) { return `Approving ${fromToken.symbol}...` }
    if (needApproval) { return `Approve ${fromToken.symbol}` }
    if (isSwapping) {
      if (isSwap) { return "Swap..." }
      if (isLong) { return "Longing..." }
      return "Shorting..."
    }

    if (isSwap) { return "Swap" }
    if (isLong) { return `Long ${toToken.symbol}` }

    return `Short ${toToken.symbol}`
  }

  useEffect(() => {
    if (active) {
      library.on('block', () => {
        updateTokenAllowance(undefined, true)
      })
      return () => {
        library.removeAllListeners('block')
      }
    }
  }, [active, library, updateTokenAllowance])


  useEffect(() => {
    const updateSwapAmounts = () => {
      if (anchorOnFromAmount) {
        if (!fromAmount) {
          setToValue("")
          return
        }
        if (toToken) {
          const { amount: nextToAmount } = getNextToAmount(fromAmount, fromTokenAddress, toTokenAddress, infoTokens)
          const nextToValue = formatAmountFree(nextToAmount, toToken.decimals, toToken.decimals)
          setToValue(nextToValue)
        }
        return
      }

      if (!toAmount) {
        setFromValue("")
        return
      }
      if (fromToken) {
        const { amount: nextFromAmount } = getNextFromAmount(toAmount, fromTokenAddress, toTokenAddress, infoTokens)
        const nextFromValue = formatAmountFree(nextFromAmount, fromToken.decimals, fromToken.decimals)
        setFromValue(nextFromValue)
      }
    }

    const updateLeverageAmounts = () => {
      if (leverageOption === "*") {
        return
      }
      if (anchorOnFromAmount) {
        if (!fromAmount) {
          setToValue("")
          return
        }

        const toTokenInfo = getTokenInfo(infoTokens, toTokenAddress)
        if (toTokenInfo && toTokenInfo.maxPrice && fromUsdMin && fromUsdMin.gt(0)) {
          const leverageMultiplier = parseInt(leverageOption)
          const nextToAmount = fromUsdMin.mul(leverageMultiplier).mul(expandDecimals(1, toToken.decimals)).div(toTokenInfo.minPrice)
          const nextToValue = formatAmountFree(nextToAmount, toToken.decimals, toToken.decimals)
          setToValue(nextToValue)
        }
        return
      }

      if (!toAmount) {
        setFromValue("")
        return
      }

      const fromTokenInfo = getTokenInfo(infoTokens, fromTokenAddress)
      if (fromTokenInfo && fromTokenInfo.minPrice && toUsdMax && toUsdMax.gt(0)) {
        const leverageMultiplier = parseInt(leverageOption)
        const nextFromAmount = toUsdMax.mul(expandDecimals(1, toToken.decimals)).div(leverageMultiplier).div(fromTokenInfo.maxPrice)
        const nextFromValue = formatAmountFree(nextFromAmount, fromToken.decimals, fromToken.decimals)
        setFromValue(nextFromValue)
      }
    }

    if (isSwap) {
      updateSwapAmounts()
    }

    if (isLong || isShort) {
      updateLeverageAmounts()
    }
  }, [anchorOnFromAmount, fromAmount, toAmount,
    fromToken, toToken, fromTokenAddress, toTokenAddress,
    infoTokens, isSwap, isLong, isShort, leverageOption, fromUsdMin, toUsdMax])

  const onSelectFromToken = (token) => {
    setFromTokenAddress(token.address)
    setIsWaitingForApproval(false)

    const updatedTokenSelection = JSON.parse(JSON.stringify(tokenSelection))
    updatedTokenSelection[swapOption] = {
      from: token.address,
      to: toTokenAddress
    }
    setTokenSelection(updatedTokenSelection)
  }

  const onSelectShortCollateralAddress = (token) => {
    setShortCollateralAddress(token.address)
  }

  const onSelectToToken = (token) => {
    setToTokenAddress(token.address)
    const updatedTokenSelection = JSON.parse(JSON.stringify(tokenSelection))
    updatedTokenSelection[swapOption] = {
      from: fromTokenAddress,
      to: token.address
    }
    setTokenSelection(updatedTokenSelection)
  }

  const onFromValueChange = (e) => {
    setAnchorOnFromAmount(true)
    setFromValue(e.target.value)
  }

  const onToValueChange = (e) => {
    setAnchorOnFromAmount(false)
    setToValue(e.target.value)
  }

  const switchTokens = () => {
    if (fromAmount && toAmount) {
      if (anchorOnFromAmount) {
        setToValue(formatAmountFree(fromAmount, fromToken.decimals, 8))
      } else {
        setFromValue(formatAmountFree(toAmount, toToken.decimals, 8))
      }
      setAnchorOnFromAmount(!anchorOnFromAmount)
    }
    setFromTokenAddress(toTokenAddress)
    setToTokenAddress(fromTokenAddress)
    setIsWaitingForApproval(false)

    const updatedTokenSelection = JSON.parse(JSON.stringify(tokenSelection))
    updatedTokenSelection[swapOption] = {
      from: toTokenAddress,
      to: fromTokenAddress
    }
    setTokenSelection(updatedTokenSelection)
  }

  const swap = () => {
    setIsSwapping(true)
    let path = [fromTokenAddress, toTokenAddress]
    if (anchorOnFromAmount) {
      const { path: multiPath } = getNextToAmount(fromAmount, fromTokenAddress, toTokenAddress, infoTokens)
      if (multiPath) { path = multiPath }
    } else {
      const { path: multiPath } = getNextFromAmount(toAmount, fromTokenAddress, toTokenAddress, infoTokens)
      if (multiPath) { path = multiPath }
    }
    path = replaceNativeTokenAddress(path)

    let method = "swap"
    let value = bigNumberify(0)
    if (toTokenAddress === AddressZero) {
      method = "swapTokensToETH"
    }

    const minOut = toAmount.mul(BASIS_POINTS_DIVISOR - 50).div(BASIS_POINTS_DIVISOR)
    let params = [path, fromAmount, minOut, account]
    if (fromTokenAddress === AddressZero) {
      method = "swapETHToTokens"
      value = fromAmount
      params = [path, minOut, account]
    }

    if (shouldRaiseGasError(getTokenInfo(infoTokens, fromTokenAddress), fromAmount)) {
      setIsSwapping(false)
      toast.error(`Leave at least ${formatAmount(DUST_BNB, 18, 3)} BNB for gas`)
      return
    }

    const contract = new ethers.Contract(routerAddress, Router.abi, library.getSigner())
    contract[method](...params, { value })
      .then(async (res) => {
        const txUrl = getExplorerUrl(CHAIN_ID) + "tx/" + res.hash
        toast.success(
          <div>
            Swap submitted! <a href={txUrl} target="_blank" rel="noopener noreferrer">View status.</a>
            <br />
          </div>
        )
        setAnchorOnFromAmount(true)
        setFromValue("")
        setToValue("")
        const pendingTxn = {
          hash: res.hash,
          message: `Swapped ${formatAmount(fromAmount, fromToken.decimals, 4, true)} ${fromToken.symbol} for ${formatAmount(toAmount, toToken.decimals, 4, true)} ${toToken.symbol}`
        }
        setPendingTxns([...pendingTxns, pendingTxn])
      })
      .catch((e) => {
        console.error(e)
        toast.error("Swap failed.")
      })
      .finally(() => {
        setIsSwapping(false)
      })
  }

  const increasePosition = () => {
    setIsSwapping(true)
    const tokenAddress0 = fromTokenAddress === AddressZero ? NATIVE_TOKEN_ADDRESS : fromTokenAddress
    const indexTokenAddress = toTokenAddress === AddressZero ? NATIVE_TOKEN_ADDRESS : toTokenAddress
    let path = [indexTokenAddress] // assume long
    if (toTokenAddress !== fromTokenAddress) {
      path = [tokenAddress0, indexTokenAddress]
    }
    if (isShort) {
      path = [shortCollateralAddress]
      if (tokenAddress0 !== shortCollateralAddress) {
        path = [tokenAddress0, shortCollateralAddress]
      }
    }

    const refPrice = isLong ? toTokenInfo.maxPrice : toTokenInfo.minPrice
    const priceBasisPoints = isLong ? (BASIS_POINTS_DIVISOR + 50) : (BASIS_POINTS_DIVISOR - 50)
    const priceLimit = refPrice.mul(priceBasisPoints).div(BASIS_POINTS_DIVISOR)

    const boundedFromAmount = fromAmount ? fromAmount : bigNumberify(0)

    if (fromAmount && fromAmount.gt(0) && fromTokenAddress === USDG_ADDRESS && isLong) {
      const { amount: nextToAmount, path: multiPath } = getNextToAmount(fromAmount, fromTokenAddress, indexTokenAddress, infoTokens)
      if (nextToAmount.eq(0)) {
        toast.error("Insufficient liquidity")
        return
      }
      if (multiPath) {
        path = replaceNativeTokenAddress(multiPath)
      }
    }

    let params = [path, indexTokenAddress, boundedFromAmount, 0, toUsdMax, isLong, priceLimit]

    let method = "increasePosition"
    let value = bigNumberify(0)
    if (fromTokenAddress === AddressZero) {
      method = "increasePositionETH"
      value = boundedFromAmount
      params = [path, indexTokenAddress, 0, toUsdMax, isLong, priceLimit]
    }

    if (shouldRaiseGasError(getTokenInfo(infoTokens, fromTokenAddress), fromAmount)) {
      setIsSwapping(false)
      toast.error(`Leave at least ${formatAmount(DUST_BNB, 18, 3)} BNB for gas`)
      return
    }

    const contract = new ethers.Contract(routerAddress, Router.abi, library.getSigner())
    contract[method](...params, { value })
      .then(async (res) => {
        const txUrl = getExplorerUrl(CHAIN_ID) + "tx/" + res.hash
        toast.success(
          <div>
            {isLong ? "Long" : "Short"} submitted! <a href={txUrl} target="_blank" rel="noopener noreferrer">View status.</a>
            <br />
          </div>
        )
        setAnchorOnFromAmount(true)
        setFromValue("")
        setToValue("")
        const indexToken = getTokenInfo(infoTokens, indexTokenAddress)
        const pendingTxn = {
          hash: res.hash,
          message: `Increased ${indexToken.symbol} ${isLong ? "Long" : "Short"} by ${formatAmount(toUsdMax, USD_DECIMALS, 2)} USD`
        }
        setPendingTxns([...pendingTxns, pendingTxn])
      })
      .catch((e) => {
        console.error(e)
        toast.error(`${isLong ? "Long" : "Short"} failed.`)
      })
      .finally(() => {
        setIsSwapping(false)
      })
  }

  const onSwapOptionChange = (opt) => {
    const updatedTokenSelection = JSON.parse(JSON.stringify(tokenSelection))
    updatedTokenSelection[swapOption] = {
      from: fromTokenAddress,
      to: toTokenAddress
    }
    setTokenSelection(updatedTokenSelection)
    setFromTokenAddress(tokenSelection[opt].from)
    setToTokenAddress(tokenSelection[opt].to)
    setSwapOption(opt)
    setAnchorOnFromAmount(true)
    setFromValue("")
    setToValue("")

    if (opt === SHORT && infoTokens) {
      const stableToken = getMostAbundantStableToken(infoTokens)
      setShortCollateralAddress(stableToken.address)
    }
  }

  useEffect(() => {
    if (swapOption !== SHORT) { return }
    for (let i = 0; i < stableTokens.length; i++) {
      const stableToken = stableTokens[i]
      const key = getPositionKey(stableToken.address, toTokenAddress, false)
      const position = positionsMap[key]
      if (position && position.size && position.size.gt(0)) {
        setShortCollateralAddress(position.collateralToken.address)
        return
      }
    }
  }, [toTokenAddress, swapOption, positionsMap, stableTokens])

  const onClickPrimary = () => {
    if (!active) {
      props.connectWallet()
      return
    }

    if (needApproval) {
      approveTokens({
        setIsApproving,
        library,
        tokenAddress: fromToken.address,
        spender: routerAddress,
        chainId: CHAIN_ID,
        onApproveSubmitted: () => {
          setIsWaitingForApproval(true)
        },
        infoTokens,
        getTokenInfo,
        pendingTxns,
        setPendingTxns
      })
      return
    }

    if (isSwap) {
      swap()
      return
    }

    increasePosition()
  }

  return (
    <div className="Exchange-swap-box">
      <div className="Exchange-swap-wallet-box border">
        {active && <a className="Exchange-swap-account" href={accountUrl} target="_blank" rel="noopener noreferrer">
          <div className="Exchange-swap-address">
            {shortenAddress(account)}
          </div>
          <div href={accountUrl} className="Exchange-swap-txns-status" target="_blank" rel="noopener noreferrer">
            {pendingTxns.length} {pendingTxns.length === 1 ? "Tx" : "Txs"}
          </div>
        </a>}
        {!active && <div className="Exchange-swap-connect-wallet" onClick={props.connectWallet}>
          Connect Wallet
        </div>}
      </div>
      <div className="Exchange-swap-box-inner border">
        <div>
          <Tab options={SWAP_OPTIONS} option={swapOption} onChange={onSwapOptionChange} />
        </div>
        <div className="Exchange-swap-section">
          <div className="Exchange-swap-section-top">
            <div className="muted">
              {fromUsdMin &&
                <div className="Exchange-swap-usd">
                  Pay: {formatAmount(fromUsdMin, USD_DECIMALS, 2, true)} USD
                </div>
              }
              {!fromUsdMin && "Pay"}
            </div>
            {fromBalance &&
              <div className="muted align-right clickable" onClick={() => { setFromValue(formatAmountFree(fromBalance, fromToken.decimals, fromToken.decimals)); setAnchorOnFromAmount(true) }}>Balance: {formatAmount(fromBalance, fromToken.decimals, 4, true)}</div>
            }
          </div>
          <div className="Exchange-swap-section-bottom">
            <div className="Exchange-swap-input-container">
              <input type="number" placeholder="0.0" className="Exchange-swap-input" value={fromValue} onChange={onFromValueChange} />
              {fromValue !== formatAmountFree(fromBalance, fromToken.decimals, fromToken.decimals) &&
                <div className="Exchange-swap-max" onClick={() => { setFromValue(formatAmountFree(fromBalance, fromToken.decimals, fromToken.decimals)); setAnchorOnFromAmount(true) }}>
                  MAX
                </div>
              }
            </div>
            <div>
              <TokenSelector
                label="From"
                chainId={CHAIN_ID}
                tokenAddress={fromTokenAddress}
                onSelectToken={onSelectFromToken}
                tokens={fromTokens}
                infoTokens={infoTokens}
                mintingCap={maxUsdg}
                showMintingCap={isSwap}
              />
            </div>
          </div>
        </div>
        <div className="Exchange-swap-ball-container">
          <div className="Exchange-swap-ball" onClick={switchTokens}>
            <IoMdSwap className="Exchange-swap-ball-icon" />
          </div>
        </div>
        <div className="Exchange-swap-section">
          <div className="Exchange-swap-section-top">
            <div className="muted">
              {toUsdMax &&
                <div className="Exchange-swap-usd">
                  {getToLabel()}: {formatAmount(toUsdMax, USD_DECIMALS, 2, true)} USD
                </div>
              }
              {!toUsdMax && getToLabel()}
            </div>
            {toBalance && isSwap &&
              <div className="muted align-right">Balance: {formatAmount(toBalance, toToken.decimals, 4, true)}</div>
            }
            {(isLong || isShort) &&
              <div className="Exchange-swap-leverage-options">
                {leverageOptions.map(option => <div className={cx("Exchange-swap-leverage-option", { active: leverageOption === option })} key={option} onClick={() => setLeverageOption(option)}>
                  {option}x
                </div>)}
                <div className={cx("Exchange-swap-leverage-option", { active: leverageOption === "*" })} onClick={() => setLeverageOption("*")}>
                  <FaAsterisk className="Exchange-swap-leverage-unlock-icon" />
                </div>
              </div>
            }
          </div>
          <div className="Exchange-swap-section-bottom">
            <div>
              <input type="number" placeholder="0.0" className="Exchange-swap-input" value={toValue} onChange={onToValueChange} />
            </div>
            <div>
              <TokenSelector
                label="To"
                chainId={CHAIN_ID}
                tokenAddress={toTokenAddress}
                onSelectToken={onSelectToToken}
                tokens={toTokens}
                infoTokens={infoTokens}
              />
            </div>
          </div>
        </div>
        {(isLong || isShort) &&
          <div className="Exchange-leverage-box">
            {(isShort) &&
              <div className="Exchange-info-row">
                <div className="Exchange-info-label">Profits In</div>
                <div className="align-right">
                  <TokenSelector label="Profits In" disabled={hasExistingPosition} chainId={CHAIN_ID} tokenAddress={shortCollateralAddress} onSelectToken={onSelectShortCollateralAddress} tokens={stableTokens} />
                </div>
              </div>
            }
            {(isLong) &&
              <div className="Exchange-info-row">
                <div className="Exchange-info-label">Profits In</div>
                <div className="align-right">
                  {toToken.symbol}
                </div>
              </div>
            }
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">Leverage</div>
              <div className="align-right">
                {hasExistingPosition && toAmount && toAmount.gt(0) && <div className="inline-block muted">
                  {formatAmount(existingPosition.leverage, 4, 2)}x
                  <BsArrowRight className="transition-arrow" />
                </div>}
                {(toAmount && leverage && leverage.gt(0)) && `${formatAmount(leverage, 4, 2)}x`}
                {(!toAmount && leverage && leverage.gt(0)) && `-`}
                {(leverage && leverage.eq(0)) && `-`}
              </div>
            </div>
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">Liq. Price</div>
              <div className="align-right">
                {hasExistingPosition && toAmount && toAmount.gt(0) && <div className="inline-block muted">
                  ${formatAmount(existingLiquidationPrice, USD_DECIMALS, 2, true)}
                  <BsArrowRight className="transition-arrow" />
                </div>}
                {toAmount && displayLiquidationPrice && `$${formatAmount(displayLiquidationPrice, USD_DECIMALS, 2, true)}`}
                {!toAmount && displayLiquidationPrice && `-`}
                {!displayLiquidationPrice && `-`}
              </div>
            </div>
          </div>
        }
        <div className="Exchange-swap-button-container">
          <button className="App-cta Exchange-swap-button" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
            {getPrimaryText()}
          </button>
        </div>
      </div>
      {(isSwap) &&
        <div className="Exchange-swap-market-box border">
          <div className="Exchange-info-row">
            <div className="Exchange-info-label">{fromToken.symbol} Price</div>
            <div className="align-right">{fromTokenInfo && formatAmount(fromTokenInfo.minPrice, USD_DECIMALS, 2, true)} USD</div>
          </div>
          <div className="Exchange-info-row">
            <div className="Exchange-info-label">{toToken.symbol} Price</div>
            <div className="align-right">{toTokenInfo && formatAmount(toTokenInfo.maxPrice, USD_DECIMALS, 2, true)} USD</div>
          </div>
          <div className="Exchange-swap-placeholder">
            <div className="Exchange-wave"></div>
          </div>
        </div>
      }
      {(isLong || isShort) &&
        <div className="Exchange-swap-market-box border">
          <div className="Exchange-swap-market-box-title">
            {isLong ? "Long" : "Short"}&nbsp;{toToken.symbol}
          </div>
          <div className="Exchange-info-row">
            <div className="Exchange-info-label">Entry Price</div>
            <div className="align-right">{formatAmount(entryMarkPrice, USD_DECIMALS, 2, true)} USD</div>
          </div>
          <div className="Exchange-info-row">
            <div className="Exchange-info-label">Exit Price</div>
            <div className="align-right">{formatAmount(exitMarkPrice, USD_DECIMALS, 2, true)} USD</div>
          </div>
          <div className="Exchange-info-row">
            <div className="Exchange-info-label">Borrow Fee</div>
            <div className="align-right">
              {(isLong && toTokenInfo) && formatAmount(toTokenInfo.fundingRate, 4, 4)}
              {(isShort && shortCollateralToken) && formatAmount(shortCollateralToken.fundingRate, 4, 4)}
              {((isLong && toTokenInfo && toTokenInfo.fundingRate) || (isShort && shortCollateralToken && shortCollateralToken.fundingRate)) && "% / 8h"}
            </div>
          </div>
        </div>
      }
    </div>
  )
}

function PositionEditor(props) {
  const { positionsMap, positionKey, isVisible, setIsVisible, infoTokens, active, account, library, collateralTokenAddress, pendingTxns, setPendingTxns } = props
  const position = (positionsMap && positionKey) ? positionsMap[positionKey] : undefined
  const [option, setOption] = useState(DEPOSIT)
  const [fromValue, setFromValue] = useState("")
  const [isApproving, setIsApproving] = useState(false)
  const [isSwapping, setIsSwapping] = useState(false)
  const prevIsVisible = usePrevious(isVisible)

  const routerAddress = getContract(CHAIN_ID, "Router")

  const { data: tokenAllowance, mutate: updateTokenAllowance } = useSWR([active, collateralTokenAddress, "allowance", account, routerAddress], {
    fetcher: fetcher(library, Token),
  })

  const isDeposit = option === DEPOSIT
  const isWithdrawal = option === WITHDRAW

  let collateralToken
  let maxAmount
  let maxAmountFormatted
  let maxAmountFormattedFree
  let fromAmount
  let needApproval

  let convertedAmount
  let convertedAmountFormatted

  let nextLeverage
  let liquidationPrice
  let nextLiquidationPrice

  let title
  if (position) {
    title = `Edit ${position.isLong ? "Long" : "Short"} ${position.indexToken.symbol}`
    collateralToken = position.collateralToken
    liquidationPrice = getLiquidationPrice(position)

    if (isDeposit) {
      fromAmount = parseValue(fromValue, collateralToken.decimals)
      maxAmount = collateralToken ? collateralToken.balance : bigNumberify(0)
      maxAmountFormatted = formatAmount(maxAmount, collateralToken.decimals, 4, true)
      maxAmountFormattedFree = formatAmountFree(maxAmount, collateralToken.decimals, 8)
      if (fromAmount) {
        convertedAmount = getUsd(fromAmount, position.collateralToken.address, false, infoTokens)
        convertedAmountFormatted = formatAmount(convertedAmount, USD_DECIMALS, 2)
      }
    } else {
      fromAmount = parseValue(fromValue, USD_DECIMALS)
      maxAmount = position.collateral
      maxAmountFormatted = formatAmount(maxAmount, USD_DECIMALS, 2, true)
      maxAmountFormattedFree = formatAmountFree(maxAmount, USD_DECIMALS, 2)
      if (fromAmount) {
        convertedAmount = fromAmount.mul(expandDecimals(1, collateralToken.decimals)).div(collateralToken.maxPrice)
        convertedAmountFormatted = formatAmount(convertedAmount, collateralToken.decimals, 4, true)
      }
    }
    needApproval = isDeposit && tokenAllowance && fromAmount && fromAmount.gt(tokenAllowance)

    if (fromAmount) {
      nextLeverage = getLeverage({
        size: position.size,
        collateral: position.collateral,
        collateralDelta: isDeposit ? convertedAmount : fromAmount,
        increaseCollateral: isDeposit,
        entryFundingRate: position.entryFundingRate,
        cumulativeFundingRate: position.cumulativeFundingRate
      })

      nextLiquidationPrice = getLiquidationPrice({
        isLong: position.isLong,
        size: position.size,
        collateral: position.collateral,
        averagePrice: position.averagePrice,
        entryFundingRate: position.entryFundingRate,
        cumulativeFundingRate: position.cumulativeFundingRate,
        collateralDelta: isDeposit ? convertedAmount : fromAmount,
        increaseCollateral: isDeposit
      })
    }
  }

  const getError = () => {
    if (!fromAmount) { return "Enter an amount" }
    if (nextLeverage && nextLeverage.eq(0)) { return "Enter an amount" }

    if (!isDeposit && fromAmount) {
      if (fromAmount.gte(position.collateral)) {
        return "Min order: 10 USD"
      }
      if (position.collateral.sub(fromAmount).lt(expandDecimals(10, USD_DECIMALS))) {
        return "Min order: 10 USD"
      }
    }

    if (nextLeverage && nextLeverage.lt(1.45 * BASIS_POINTS_DIVISOR)) {
      return "Min leverage: 1.5x"
    }

    if (nextLeverage && nextLeverage.gt(30.5 * BASIS_POINTS_DIVISOR)) {
      return "Max leverage: 30x"
    }
  }

  const isPrimaryEnabled = () => {
    const error = getError()
    if (error) { return false }
    if (isSwapping) { return false }

    return true
  }

  const getPrimaryText = () => {
    const error = getError()
    if (error) { return error }
    if (isApproving) { return `Approving ${position.collateralToken.symbol}...` }
    if (needApproval) { return `Approve ${position.collateralToken.symbol}` }
    if (isSwapping) {
      if (isDeposit) { return "Depositing..." }
      return "Withdrawing..."
    }

    if (isDeposit) { return "Deposit" }

    return "Withdraw"
  }

  const resetForm = () => {
    setFromValue("")
  }

  useEffect(() => {
    if (prevIsVisible !== isVisible) {
      resetForm()
    }
  }, [prevIsVisible, isVisible])

  useEffect(() => {
    if (active) {
      library.on('block', () => {
        updateTokenAllowance(undefined, true)
      })
      return () => {
        library.removeAllListeners('block')
      }
    }
  }, [active, library, updateTokenAllowance])

  const depositCollateral = () => {
    setIsSwapping(true)
    const tokenAddress0 = collateralTokenAddress === AddressZero ? NATIVE_TOKEN_ADDRESS : collateralTokenAddress
    const path = [tokenAddress0]
    const indexTokenAddress = position.indexToken.address === AddressZero ? NATIVE_TOKEN_ADDRESS : position.indexToken.address

    const priceBasisPoints = position.isLong ? 11000 : 9000
    const priceLimit = position.indexToken.maxPrice.mul(priceBasisPoints).div(10000)

    let params = [path, indexTokenAddress, fromAmount, 0, 0, position.isLong, priceLimit]

    let method = "increasePosition"
    let value = bigNumberify(0)
    if (collateralTokenAddress === AddressZero) {
      method = "increasePositionETH"
      value = fromAmount
      params = [path, indexTokenAddress, 0, 0, position.isLong, priceLimit]
    }

    if (shouldRaiseGasError(getTokenInfo(infoTokens, collateralTokenAddress), fromAmount)) {
      setIsSwapping(false)
      toast.error(`Leave at least ${formatAmount(DUST_BNB, 18, 3)} BNB for gas`)
      return
    }

    const contract = new ethers.Contract(routerAddress, Router.abi, library.getSigner())
    contract[method](...params, { value })
      .then(async (res) => {
        const txUrl = getExplorerUrl(CHAIN_ID) + "tx/" + res.hash
        toast.success(
          <div>
            Deposit submitted! <a href={txUrl} target="_blank" rel="noopener noreferrer">View status.</a>
            <br />
          </div>
        )
        setFromValue("")
        setIsVisible(false)
        const pendingTxn = {
          hash: res.hash,
          message: `Deposited ${formatAmount(fromAmount, position.collateralToken.decimals, 4)} ${position.collateralToken.symbol} into ${position.indexToken.symbol} ${position.isLong ? "Long" : "Short"}`
        }
        setPendingTxns([...pendingTxns, pendingTxn])
      })
      .catch((e) => {
        console.error(e)
        toast.error(`Deposit failed.`)
      })
      .finally(() => {
        setIsSwapping(false)
      })
  }

  const withdrawCollateral = () => {
    setIsSwapping(true)
    const tokenAddress0 = collateralTokenAddress === AddressZero ? NATIVE_TOKEN_ADDRESS : collateralTokenAddress
    const indexTokenAddress = position.indexToken.address === AddressZero ? NATIVE_TOKEN_ADDRESS : position.indexToken.address
    const priceBasisPoints = position.isLong ? 9000 : 11000
    const priceLimit = position.indexToken.maxPrice.mul(priceBasisPoints).div(10000)

    let params = [tokenAddress0, indexTokenAddress, fromAmount, 0, position.isLong, account, priceLimit]
    let method = collateralTokenAddress === AddressZero ? "decreasePositionETH" : "decreasePosition"

    const contract = new ethers.Contract(routerAddress, Router.abi, library.getSigner())
    contract[method](...params)
      .then(async (res) => {
        const txUrl = getExplorerUrl(CHAIN_ID) + "tx/" + res.hash
        toast.success(
          <div>
            Withdrawal submitted! <a href={txUrl} target="_blank" rel="noopener noreferrer">View status.</a>
            <br />
          </div>
        )
        setFromValue("")
        setIsVisible(false)
        const pendingTxn = {
          hash: res.hash,
          message: `Withdrew ${formatAmount(fromAmount, USD_DECIMALS, 2)} USD from ${position.indexToken.symbol} ${position.isLong ? "Long" : "Short"}`
        }
        setPendingTxns([...pendingTxns, pendingTxn])
      })
      .catch((e) => {
        console.error(e)
        toast.error(`Withdraw failed.`)
      })
      .finally(() => {
        setIsSwapping(false)
      })
  }

  const onClickPrimary = () => {
    if (needApproval) {
      approveTokens({
        setIsApproving,
        library,
        tokenAddress: collateralTokenAddress,
        spender: routerAddress,
        chainId: CHAIN_ID,
        infoTokens,
        getTokenInfo,
        pendingTxns,
        setPendingTxns
      })
      return
    }

    if (isDeposit) {
      depositCollateral()
      return
    }

    withdrawCollateral()
  }

  return (
    <div className="PositionEditor">
      {(position) &&
        <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={title}>
          <div>
            <Tab options={EDIT_OPTIONS} option={option} setOption={setOption} onChange={resetForm} />
            {(isDeposit || isWithdrawal) && <div>
              <div className="Exchange-swap-section">
                <div className="Exchange-swap-section-top">
                  <div className="muted">
                    {convertedAmountFormatted &&
                      <div className="Exchange-swap-usd">
                        {isDeposit ? "Deposit" : "Withdraw"}: {convertedAmountFormatted} {isDeposit ? "USD" : position.collateralToken.symbol}
                      </div>
                    }
                    {!convertedAmountFormatted && `${isDeposit ? "Deposit" : "Withdraw"}`}
                  </div>
                  {maxAmount &&
                    <div className="muted align-right clickable" onClick={() => setFromValue(maxAmountFormattedFree)}>Max: {maxAmountFormatted}</div>
                  }
                </div>
                <div className="Exchange-swap-section-bottom">
                  <div className="Exchange-swap-input-container">
                    <input type="number" placeholder="0.0" className="Exchange-swap-input" value={fromValue} onChange={(e) => setFromValue(e.target.value)} />
                    {fromValue !== maxAmountFormattedFree &&
                      <div className="Exchange-swap-max" onClick={() => { setFromValue(maxAmountFormattedFree) }}>
                        MAX
                      </div>
                    }
                  </div>
                  <div className="PositionEditor-token-symbol">
                    {isDeposit ? position.collateralToken.symbol : "USD"}
                  </div>
                </div>
              </div>
              <div className="PositionEditor-info-box">
                <div className="Exchange-info-row">
                  <div className="Exchange-info-label">Size</div>
                  <div className="align-right">
                    {formatAmount(position.size, USD_DECIMALS, 2, true)} USD
                  </div>
                </div>
                <div className="Exchange-info-row">
                  <div className="Exchange-info-label">Collateral</div>
                  <div className="align-right">
                    {formatAmount(position.collateral, USD_DECIMALS, 2, true)} USD
                  </div>
                </div>
                <div className="Exchange-info-row">
                  <div className="Exchange-info-label">Leverage</div>
                  <div className="align-right">
                    {!nextLeverage && <div>
                      {formatAmount(position.leverage, 4, 2, true)}x
                    </div>}
                    {nextLeverage && <div>
                      <div className="inline-block muted">
                        {formatAmount(position.leverage, 4, 2, true)}x
                        <BsArrowRight className="transition-arrow" />
                      </div>
                      {formatAmount(nextLeverage, 4, 2, true)}x
                    </div>}
                  </div>
                </div>
                <div className="Exchange-info-row">
                  <div className="Exchange-info-label">Liq. Price</div>
                  <div className="align-right">
                    {!nextLiquidationPrice && <div>
                      {!fromAmount && `$${formatAmount(liquidationPrice, USD_DECIMALS, 2, true)}`}
                      {fromAmount && "-"}
                    </div>}
                    {nextLiquidationPrice && <div>
                      <div className="inline-block muted">
                        ${formatAmount(liquidationPrice, USD_DECIMALS, 2, true)}
                        <BsArrowRight className="transition-arrow" />
                      </div>
                      ${formatAmount(nextLiquidationPrice, USD_DECIMALS, 2, true)}
                    </div>}
                  </div>
                </div>
                <div className="Exchange-info-row">
                  <div className="Exchange-info-label">Mark Price</div>
                  <div className="align-right">
                    ${formatAmount(position.markPrice, USD_DECIMALS, 2, true)}
                  </div>
                </div>
              </div>

              <div className="Exchange-swap-button-container">
                <button className="App-cta Exchange-swap-button" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
                  {getPrimaryText()}
                </button>
              </div>
            </div>}
          </div>
        </Modal>
      }
    </div>
  )
}

function PositionSeller(props) {
  const { positionsMap, positionKey, isVisible, setIsVisible, account, library, infoTokens, pendingTxns, setPendingTxns } = props
  const position = (positionsMap && positionKey) ? positionsMap[positionKey] : undefined
  const [fromValue, setFromValue] = useState("")
  const [isSwapping, setIsSwapping] = useState(false)
  const prevIsVisible = usePrevious(isVisible)

  const routerAddress = getContract(CHAIN_ID, "Router")

  let collateralToken
  let maxAmount
  let maxAmountFormatted
  let maxAmountFormattedFree
  let fromAmount

  let convertedAmount
  let convertedAmountFormatted

  let nextLeverage
  let liquidationPrice
  let nextLiquidationPrice
  let isClosing
  let sizeDelta

  let receiveAmount = bigNumberify(0)
  let convertedReceiveAmount = bigNumberify(0)
  let adjustedDelta = bigNumberify(0)

  let title
  let fundingFee
  if (position) {
    fundingFee = getFundingFee(position)
    fromAmount = parseValue(fromValue, USD_DECIMALS)
    sizeDelta = fromAmount

    title = `Sell ${position.isLong ? "Long" : "Short"} ${position.indexToken.symbol}`
    collateralToken = position.collateralToken
    liquidationPrice = getLiquidationPrice(position)

    if (fromAmount) {
      isClosing = position.size.sub(fromAmount).lt(DUST_USD)
    }

    if (isClosing) {
      sizeDelta = position.size
      receiveAmount = position.collateral
    }

    if (sizeDelta) {
      adjustedDelta = position.delta.mul(sizeDelta).div(position.size)
    }

    if (position.hasProfit) {
      receiveAmount = receiveAmount.add(adjustedDelta)
    } else {
      if (receiveAmount.gt(adjustedDelta)) {
        receiveAmount = receiveAmount.sub(adjustedDelta)
      } else {
        receiveAmount = bigNumberify(0)
      }
    }

    if (sizeDelta) {
      const fees = getPositionFee(sizeDelta)
      const fundingFee = position.size.mul(position.cumulativeFundingRate.sub(position.entryFundingRate)).div(FUNDING_RATE_PRECISION)
      const totalFees = fees.add(fundingFee)
      if (receiveAmount.gt(totalFees)) {
        receiveAmount = receiveAmount.sub(totalFees)
      } else {
        receiveAmount = bigNumberify(0)
      }
    }

    convertedReceiveAmount = getTokenAmount(receiveAmount, collateralToken.address, false, infoTokens)

    maxAmount = position.size
    maxAmountFormatted = formatAmount(maxAmount, USD_DECIMALS, 2, true)
    maxAmountFormattedFree = formatAmountFree(maxAmount, USD_DECIMALS, 2)
    if (fromAmount) {
      convertedAmount = fromAmount.mul(expandDecimals(1, collateralToken.decimals)).div(collateralToken.maxPrice)
      convertedAmountFormatted = formatAmount(convertedAmount, collateralToken.decimals, 4, true)
    }

    if (fromAmount) {
      nextLeverage = getLeverage({
        size: position.size,
        sizeDelta,
        collateral: position.collateral,
        entryFundingRate: position.entryFundingRate,
        cumulativeFundingRate: position.cumulativeFundingRate
      })

      if (!isClosing) {
        nextLiquidationPrice = getLiquidationPrice({
          isLong: position.isLong,
          size: position.size,
          sizeDelta,
          collateral: position.collateral,
          averagePrice: position.averagePrice,
          entryFundingRate: position.entryFundingRate,
          cumulativeFundingRate: position.cumulativeFundingRate
        })
      }
    }
  }

  const getError = () => {
    if (!fromAmount) { return "Enter an amount" }
    if (nextLeverage && nextLeverage.eq(0)) { return "Enter an amount" }

    if (!isClosing && !position.hasProfit) {
      if (position.collateral.sub(adjustedDelta).lt(expandDecimals(10, USD_DECIMALS))) {
        return "Min order: 10 USD"
      }
    }

    if (nextLeverage && nextLeverage.lt(1.45 * BASIS_POINTS_DIVISOR)) {
      return "Min leverage: 1.5x"
    }

    if (nextLeverage && nextLeverage.gt(30.5 * BASIS_POINTS_DIVISOR)) {
      return "Max leverage: 30x"
    }
  }

  const isPrimaryEnabled = () => {
    const error = getError()
    if (error) { return false }
    if (isSwapping) { return false }

    return true
  }

  const getPrimaryText = () => {
    const error = getError()
    if (error) { return error }
    if (isSwapping) { return "Selling..." }
    return "Sell"
  }

  const resetForm = () => {
    setFromValue("")
  }

  useEffect(() => {
    if (prevIsVisible !== isVisible) {
      resetForm()
    }
  }, [prevIsVisible, isVisible])

  const onClickPrimary = () => {
    setIsSwapping(true)
    const collateralTokenAddress = position.collateralToken.address
    const tokenAddress0 = collateralTokenAddress === AddressZero ? NATIVE_TOKEN_ADDRESS : collateralTokenAddress
    const indexTokenAddress = position.indexToken.address === AddressZero ? NATIVE_TOKEN_ADDRESS : position.indexToken.address
    const priceBasisPoints = position.isLong ? (BASIS_POINTS_DIVISOR - 50) : (BASIS_POINTS_DIVISOR + 50)
    const refPrice = position.isLong ? position.indexToken.minPrice : position.indexToken.maxPrice
    const priceLimit = refPrice.mul(priceBasisPoints).div(10000)

    let params = [tokenAddress0, indexTokenAddress, 0, sizeDelta, position.isLong, account, priceLimit]
    let method = collateralTokenAddress === AddressZero ? "decreasePositionETH" : "decreasePosition"

    const contract = new ethers.Contract(routerAddress, Router.abi, library.getSigner())
    contract[method](...params)
      .then(async (res) => {
        const txUrl = getExplorerUrl(CHAIN_ID) + "tx/" + res.hash
        toast.success(
          <div>
            Sell submitted! <a href={txUrl} target="_blank" rel="noopener noreferrer">View status.</a>
            <br />
          </div>
        )
        setFromValue("")
        setIsVisible(false)
        const pendingTxn = {
          hash: res.hash,
          message: `Decreased ${position.indexToken.symbol} ${position.isLong ? "Long" : "Short"} by ${formatAmount(sizeDelta, USD_DECIMALS, 2)} USD`
        }
        setPendingTxns([...pendingTxns, pendingTxn])
      })
      .catch((e) => {
        console.error(e)
        toast.error(`Sell failed.`)
      })
      .finally(() => {
        setIsSwapping(false)
      })
  }

  return (
    <div className="PositionEditor">
      {(position) &&
        <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={title}>
          <div>
            <div>
              <div className="Exchange-swap-section">
                <div className="Exchange-swap-section-top">
                  <div className="muted">
                    {convertedAmountFormatted &&
                      <div className="Exchange-swap-usd">
                        Sell: {convertedAmountFormatted} {position.collateralToken.symbol}
                      </div>
                    }
                    {!convertedAmountFormatted && "Sell"}
                  </div>
                  {maxAmount &&
                    <div className="muted align-right clickable" onClick={() => setFromValue(maxAmountFormattedFree)}>Max: {maxAmountFormatted}</div>
                  }
                </div>
                <div className="Exchange-swap-section-bottom">
                  <div className="Exchange-swap-input-container">
                    <input type="number" placeholder="0.0" className="Exchange-swap-input" value={fromValue} onChange={(e) => setFromValue(e.target.value)} />
                    {fromValue !== maxAmountFormattedFree &&
                      <div className="Exchange-swap-max" onClick={() => { setFromValue(maxAmountFormattedFree) }}>
                        MAX
                      </div>
                    }
                  </div>
                  <div className="PositionEditor-token-symbol">
                    USD
                  </div>
                </div>
              </div>
              <div className="PositionEditor-info-box">
                <div className="Exchange-info-row">
                  <div className="Exchange-info-label">Size</div>
                  <div className="align-right">
                    {formatAmount(position.size, USD_DECIMALS, 2, true)} USD
                  </div>
                </div>
                <div className="Exchange-info-row">
                  <div className="Exchange-info-label">Collateral</div>
                  <div className="align-right">
                    {formatAmount(position.collateral, USD_DECIMALS, 2, true)} USD
                  </div>
                </div>
                <div className="Exchange-info-row">
                  <div className="Exchange-info-label">Leverage</div>
                  <div className="align-right">
                    {isClosing && "-"}
                    {!isClosing && <div>
                      {!nextLeverage && <div>
                        {formatAmount(position.leverage, 4, 2)}x
                      </div>}
                      {nextLeverage && <div>
                        <div className="inline-block muted">
                          {formatAmount(position.leverage, 4, 2)}x
                          <BsArrowRight className="transition-arrow" />
                        </div>
                        {formatAmount(nextLeverage, 4, 2)}x
                      </div>}
                    </div>}
                  </div>
                </div>
                <div className="Exchange-info-row">
                  <div className="Exchange-info-label">Liq. Price</div>
                  <div className="align-right">
                    {isClosing && "-"}
                    {!isClosing && <div>
                      {!nextLiquidationPrice && <div>
                        {!fromAmount && `$${formatAmount(liquidationPrice, USD_DECIMALS, 2, true)}`}
                        {fromAmount && "-"}
                      </div>}
                      {nextLiquidationPrice && <div>
                        <div className="inline-block muted">
                          ${formatAmount(liquidationPrice, USD_DECIMALS, 2, true)}
                          <BsArrowRight className="transition-arrow" />
                        </div>
                        ${formatAmount(nextLiquidationPrice, USD_DECIMALS, 2, true)}
                      </div>}
                    </div>}
                  </div>
                </div>
                <div className="Exchange-info-row">
                  <div className="Exchange-info-label">Mark Price</div>
                  <div className="align-right">
                    ${formatAmount(position.markPrice, USD_DECIMALS, 2, true)}
                  </div>
                </div>
                <div className="Exchange-info-row">
                  <div className="Exchange-info-label">PnL</div>
                  <div className="align-right">
                    {position.hasProfit && position.delta.gt(0) && "+"}
                    {!position.hasProfit && position.delta.gt(0) && "-"}
                    {formatAmount(position.delta, USD_DECIMALS, 2, true)} {(!position.isLong && position.collateralToken) ? position.collateralToken.symbol : "USD"}
                  </div>
                </div>
                <div className="Exchange-info-row">
                  <div className="Exchange-info-label">Funding Fee</div>
                  <div className="align-right">
                    {formatAmount(fundingFee, USD_DECIMALS, 2, true)} USD
                  </div>
                </div>
                <div className="Exchange-info-row">
                  <div className="Exchange-info-label">Receive</div>
                  <div className="align-right">
                    {formatAmount(convertedReceiveAmount, position.collateralToken.decimals, 4, true)} {position.collateralToken.symbol}
                  </div>
                </div>
              </div>
              <div className="Exchange-swap-button-container">
                <button className="App-cta Exchange-swap-button" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
                  {getPrimaryText()}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      }
    </div>
  )
}

function PositionsList(props) {
  const { positions, positionsMap, infoTokens, active, account, library, pendingTxns, setPendingTxns } = props
  const [positionToEditKey, setPositionToEditKey] = useState(undefined)
  const [positionToSellKey, setPositionToSellKey] = useState(undefined)
  const [isPositionEditorVisible, setIsPositionEditorVisible] = useState(undefined)
  const [isPositionSellerVisible, setIsPositionSellerVisible] = useState(undefined)
  const [collateralTokenAddress, setCollateralTokenAddress] = useState(undefined)

  const editPosition = (position) => {
    setCollateralTokenAddress(position.collateralToken.address)
    setPositionToEditKey(position.key)
    setIsPositionEditorVisible(true)
  }

  const sellPosition = (position) => {
    setPositionToSellKey(position.key)
    setIsPositionSellerVisible(true)
  }

  return (
    <div>
      <PositionEditor
        positionsMap={positionsMap}
        positionKey={positionToEditKey}
        isVisible={isPositionEditorVisible}
        setIsVisible={setIsPositionEditorVisible}
        infoTokens={infoTokens}
        active={active}
        account={account}
        library={library}
        collateralTokenAddress={collateralTokenAddress}
        pendingTxns={pendingTxns}
        setPendingTxns={setPendingTxns}
      />
      <PositionSeller
        positionsMap={positionsMap}
        positionKey={positionToSellKey}
        isVisible={isPositionSellerVisible}
        setIsVisible={setIsPositionSellerVisible}
        infoTokens={infoTokens}
        active={active}
        account={account}
        library={library}
        pendingTxns={pendingTxns}
        setPendingTxns={setPendingTxns}
      />
      {(positions) && <table className="Exchange-positions small border">
        <tbody>
          <tr className="Exchange-positions-header">
            <th>
              <div>Position</div>
              <div className="muted">Side</div>
            </th>
            <th>
              <div>Size</div>
              <div className="muted">PnL</div>
            </th>
            <th>
              <div>Liq. Price</div>
              <div className="muted">Leverage</div>
            </th>
            <th></th>
            <th></th>
          </tr>
          {positions.length === 0 && <tr>
            <td colSpan="5">
              No open positions
              </td>
          </tr>}
          {positions.map(position => {
            const liquidationPrice = getLiquidationPrice(position)
            return (<tr key={position.key}>
              <td>
                <div className="Exchange-positions-title">{position.indexToken.symbol}</div>
                <div className={cx("Exchange-positions-side", { positive: position.isLong, negative: !position.isLong })}>
                  {position.isLong ? "Long" : "Short"}
                </div>
              </td>
              <td>
                <div>${formatAmount(position.size, USD_DECIMALS, 2, true)}</div>
                <div className={cx({ positive: position.hasProfit && position.delta.gt(0), negative: !position.hasProfit && position.delta.gt(0) })}>
                  {position.hasProfit && position.delta.gt(0) && "+"}
                  {!position.hasProfit && position.delta.gt(0) && "-"}
                  ${formatAmount(position.delta, USD_DECIMALS, 2)}
                </div>
              </td>
              <td>
                <div>${formatAmount(liquidationPrice, USD_DECIMALS, 2, true)}</div>
                <div className="muted">{formatAmount(position.leverage, 4, 2, true)}x</div>
              </td>
              <td>
                <button className="Exchange-positions-action" onClick={() => editPosition(position)}>
                  Edit
                </button>
              </td>
              <td>
                <button className="Exchange-positions-action" onClick={() => sellPosition(position)}>
                  Sell
                </button>
              </td>
            </tr>)
          })}
        </tbody>
      </table>}
      <table className="Exchange-positions large">
        <tbody>
          <tr className="Exchange-positions-header">
            <th>Position</th>
            <th>Side</th>
            <th>Size</th>
            <th className="Exchange-positions-extra-info">Entry Price</th>
            <th className="Exchange-positions-extra-info">Mark Price</th>
            <th className="Exchange-positions-extra-info">Liq. Price</th>
            <th>PnL</th>
            <th></th>
            <th></th>
          </tr>
          {positions.length === 0 &&
            <tr>
              <td>No open positions</td>
              <td>-</td>
              <td>-</td>
              <td className="Exchange-positions-extra-info">-</td>
              <td className="Exchange-positions-extra-info">-</td>
              <td className="Exchange-positions-extra-info">-</td>
              <td>-</td>
              <td></td>
              <td></td>
            </tr>
          }
          {positions.map(position => {
            const liquidationPrice = getLiquidationPrice(position)
            return (
              <tr key={position.key}>
                <td>
                  <div className="Exchange-positions-title">{position.indexToken.symbol}</div>
                  <div className="Exchange-positions-leverage-container">
                    <div className="Exchange-positions-leverage">
                      {formatAmount(position.leverage, 4, 2, true)}x
                  </div>
                  </div>
                </td>
                <td className={cx({ positive: position.isLong, negative: !position.isLong })}>
                  {position.isLong ? "Long" : "Short"}
                </td>
                <td>
                  {formatAmount(position.size, USD_DECIMALS, 2, true)} USD
              </td>
                <td className="Exchange-positions-extra-info">{formatAmount(position.averagePrice, USD_DECIMALS, 2, true)} USD</td>
                <td className="Exchange-positions-extra-info">{formatAmount(position.markPrice, USD_DECIMALS, 2, true)} USD</td>
                <td className="Exchange-positions-extra-info">{formatAmount(liquidationPrice, USD_DECIMALS, 2, true)} USD</td>
                <td className={cx({ positive: position.hasProfit && position.delta.gt(0), negative: !position.hasProfit && position.delta.gt(0) })}>
                  {position.hasProfit && position.delta.gt(0) && "+"}
                  {!position.hasProfit && position.delta.gt(0) && "-"}
                  {formatAmount(position.delta, USD_DECIMALS, 2)} {(!position.isLong && position.collateralToken) ? position.collateralToken.symbol : "USD"}
                </td>
                <td>
                  <button className="Exchange-positions-action" onClick={() => editPosition(position)}>
                    Edit
                </button>
                </td>
                <td>
                  <button className="Exchange-positions-action" onClick={() => sellPosition(position)}>
                    Sell
                </button>
                </td>
              </tr>
            )
          })
          }
        </tbody>
      </table>
    </div>
  )
}

const PriceTooltip = ({ active, payload, label }) => {
  if (active && payload && payload[0] && payload[0].payload) {
    return (
      <div className="Exchange-price-tooltip">
        <div className="Exchange-price-time">{formatDateTime(payload[0].payload.time)}</div>
        <div>{numberWithCommas(payload[0].payload.chartValue.toFixed(2))} USD</div>
      </div>
    )
  }

  return null
}

function ExchangeChart(props) {
  const { swapOption, fromTokenAddress, toTokenAddress, infoTokens } = props
  const [chartRangeOption, setChartRangeOption] = useState(DAY)
  const fromToken = getTokenInfo(infoTokens, fromTokenAddress)
  const toToken = getTokenInfo(infoTokens, toTokenAddress)
  const chartToken = getChartToken(swapOption, fromToken, toToken)
  const marketName = chartToken ? chartToken.symbol + "_USD" : undefined

  let days = 1
  if (chartRangeOption === WEEK) {
    days = 7
  }
  if (chartRangeOption === MONTH) {
    days = 30
  }
  const url = `https://cors-300607.uc.r.appspot.com/price?market=${marketName}&days=${days}&chainId=56`
  const { data: prices, mutate: updatePrices } = useSWR([url], {
    fetcher: (...args) => fetch(...args).then(res => res.json())
  })

  let priceData = []
  let maxChartValue
  let minChartValue
  let hasPriceIncrease
  let priceDeltaPercentage
  const now = parseInt(Date.now() / 1000)
  let firstPrice
  let lastPrice
  if (prices && prices.data && prices.data.result && prices.data.result[0]) {
    const result = JSON.parse(JSON.stringify(prices.data.result[0].values))
    if (chartToken && chartToken.maxPrice) {
      result.push([now, formatAmount(chartToken.maxPrice, USD_DECIMALS, 2)])
    }
    let minValue = result.length === 0 ? 1000000 : parseFloat(result[0][1])
    let maxValue = 0
    for (let i = 0; i < result.length; i++) {
      const item = result[i]
      const chartValue = parseFloat(item[1])
      if (!isNaN(chartValue)) {
        if (chartValue > maxValue) {
          maxValue = chartValue
        }
        if (chartValue < minValue) {
          minValue = chartValue
        }
      }

      if (parseInt(item[0]) <= now) {
        priceData.push({
          time: item[0],
          chartValue,
          strValue: item[1],
          chartValueFormatted: numberWithCommas(chartValue)
        })
      }
    }

    if (priceData.length > 1) {
      firstPrice = priceData[0].chartValue
      lastPrice = priceData[priceData.length - 1].chartValue
      hasPriceIncrease = lastPrice > firstPrice
      const priceDelta = lastPrice > firstPrice ? (lastPrice - firstPrice) : (firstPrice - lastPrice)
      priceDeltaPercentage = (priceDelta / firstPrice) * 100
    }

    if (minValue && maxValue) {
      const range = maxValue - minValue
      maxChartValue = maxValue + range / 1.5
      minChartValue = minValue - range / 5
    }

    if (chartToken && chartToken.isStable) {
      maxChartValue = 1.5
      minChartValue = 0.5
    }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      updatePrices(undefined, true)
    }, 60 * 1000)
    return () => clearInterval(interval);
  }, [updatePrices])

  return (
    <div className="ExchangeChart border">
      <div className="ExchangeChart-top">
        <div className="ExchangeChart-top-inner">
          <div>
            <div className="ExchangeChart-title">
              {chartToken && `${chartToken.symbol} / USD`}
            </div>
            <div className="ExchangeChart-range-options">
              {CHART_RANGE_OPTIONS.map(option => <div key={option} className={cx("ExchangeChart-range-option", { active: option === chartRangeOption })} onClick={() => setChartRangeOption(option)}>
                {option}
              </div>)}
            </div>
          </div>
          <div className="ExchangeChart-main-price">
            <div>
              {(lastPrice) && <div className="ExchangeChart-dollar-sign">$</div>}
              {(lastPrice) && <div className="ExchangeChart-main-price-text">{numberWithCommas(lastPrice.toFixed(2))}</div>}
            </div>
            <div className={cx("ExchangeChart-price-delta", { positive: hasPriceIncrease, negative: !hasPriceIncrease })}>
              {priceDeltaPercentage !== undefined && `${hasPriceIncrease ? "+" : "-"}${priceDeltaPercentage.toFixed(2)}%`}
            </div>
          </div>
        </div>
      </div>
      <div className="ExchangeChart-container">
        <ResponsiveContainer>
          <AreaChart data={priceData} margin={{ top: 0, right: 0, left: 0, bottom: 0, }} >
            <defs>
              <linearGradient id="priceStrokeColor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="20%" stopColor="#c2489d" stopOpacity={1} />
                <stop offset="95%" stopColor="#514cd9" stopOpacity={1} />
              </linearGradient>
              <linearGradient id="priceFillColor" x1="0" y1="0" x2="0" y2="1" gradientTransform="rotate(0)">
                <stop offset="0%" stopColor="#e00092" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#4f00fa" stopOpacity={0.5} />
              </linearGradient>
            </defs>
            <YAxis hide={true} domain={[minChartValue, maxChartValue]} />
            <Tooltip content={PriceTooltip} />
            <Area type="natural" dataKey="chartValue" stroke="url(#priceStrokeColor)" strokeWidth="2" fill="url(#priceFillColor)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function TradeHistory(props) {
  const { account, infoTokens } = props
  const url = `https://gambit-server-staging.uc.r.appspot.com/actions?account=${account}`
  const { data: trades, mutate: updateTrades } = useSWR([url], {
    fetcher: (...args) => fetch(...args).then(res => res.json())
  })

  useEffect(() => {
    const interval = setInterval(() => {
      updateTrades(undefined, true)
    }, 10 * 1000)
    return () => clearInterval(interval);
  }, [updateTrades])

  const getMsg = (trade) => {
    const tradeData = trade.data
    const params = JSON.parse(tradeData.params)
    let defaultMsg = ""

    if (tradeData.action === "BuyUSDG") {
      const token = getTokenInfo(infoTokens, params.token)
      if (!token) {
        return defaultMsg
      }
      return `Swap ${formatAmount(params.tokenAmount, token.decimals, 4, true)} ${token.symbol} for ${formatAmount(params.usdgAmount, 18, 4, true)} USDG`
    }

    if (tradeData.action === "SellUSDG") {
      const token = getTokenInfo(infoTokens, params.token)
      if (!token) {
        return defaultMsg
      }
      return `Swap ${formatAmount(params.usdgAmount, 18, 4, true)} USDG for ${formatAmount(params.tokenAmount, token.decimals, 4, true)} ${token.symbol}`
    }

    if (tradeData.action === "Swap") {
      const tokenIn = getTokenInfo(infoTokens, params.tokenIn)
      const tokenOut = getTokenInfo(infoTokens, params.tokenOut)
      if (!tokenIn || !tokenOut) {
        return defaultMsg
      }
      return `Swap ${formatAmount(params.amountIn, tokenIn.decimals, 4, true)} ${tokenIn.symbol} for ${formatAmount(params.amountOut, tokenOut.decimals, 4, true)} ${tokenOut.symbol}`
    }

    if (tradeData.action === "IncreasePosition-Long" || tradeData.action === "IncreasePosition-Short") {
      const indexToken = getTokenInfo(infoTokens, params.indexToken)
      if (!indexToken) {
        return defaultMsg
      }
      if (bigNumberify(params.sizeDelta).eq(0)) {
        return `Deposit ${formatAmount(params.collateralDelta, USD_DECIMALS, 2, true)} USD into ${indexToken.symbol} ${params.isLong ? "Long" : "Short"}`
      }
      return `Increase ${indexToken.symbol} ${params.isLong ? "Long" : "Short"}, +${formatAmount(params.sizeDelta, USD_DECIMALS, 2, true)} USD, ${indexToken.symbol} Price: ${formatAmount(params.price, USD_DECIMALS, 2, true)} USD`
    }

    if (tradeData.action === "DecreasePosition-Long" || tradeData.action === "DecreasePosition-Short") {
      const indexToken = getTokenInfo(infoTokens, params.indexToken)
      if (!indexToken) {
        return defaultMsg
      }
      if (bigNumberify(params.sizeDelta).eq(0)) {
        return `Withdraw ${formatAmount(params.collateralDelta, USD_DECIMALS, 2, true)} USD from ${indexToken.symbol} ${params.isLong ? "Long" : "Short"}`
      }
      return `Decrease ${indexToken.symbol} ${params.isLong ? "Long" : "Short"}, -${formatAmount(params.sizeDelta, USD_DECIMALS, 2, true)} USD, ${indexToken.symbol} Price: ${formatAmount(params.price, USD_DECIMALS, 2, true)} USD`
    }

    if (tradeData.action === "LiquidatePosition-Long" || tradeData.action === "LiquidatePosition-Short") {
      const indexToken = getTokenInfo(infoTokens, params.indexToken)
      if (!indexToken) {
        return defaultMsg
      }
      return `Liquidated ${indexToken.symbol} ${params.isLong ? "Long" : "Short"}, ${formatAmount(params.size, USD_DECIMALS, 2, true)} USD, ${indexToken.symbol} Price: ${formatAmount(params.markPrice, USD_DECIMALS, 2, true)} USD`
    }

    return tradeData.action
  }

  return (
    <div className="TradeHistory">
      {(!trades || trades.length === 0) && <div className="TradeHistory-row border">
        No trades yet
    </div>
      }
      {(trades && trades.length > 0) && trades.slice(0, 10).map((trade, index) => {
        const tradeData = trade.data
        const txUrl = getExplorerUrl(CHAIN_ID) + "tx/" + tradeData.txhash
        let msg = getMsg(trade)
        return (
          <div className="TradeHistory-row border" key={index}>
            <div>
              <div className="muted TradeHistory-time">{formatDateTime(tradeData.timestamp)}</div>
              <a className="plain" href={txUrl} target="_blank" rel="noopener noreferrer">{msg}</a>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Exchange() {
  const tokens = getTokens(CHAIN_ID)
  const whitelistedTokens = getWhitelistedTokens(CHAIN_ID)
  const positionQuery = getPositionQuery(whitelistedTokens)
  const [isPositionsListVisible, setIsPositionsListVisible] = useState(true)
  const [pendingTxns, setPendingTxns] = useState([])

  const [tokenSelection, setTokenSelection] = useLocalStorage("Exchange-token-selection", {
    [SWAP]: {
      from: getTokenBySymbol(CHAIN_ID, "BNB").address,
      to: getTokenBySymbol(CHAIN_ID, "USDG").address,
    },
    [LONG]: {
      from: getTokenBySymbol(CHAIN_ID, "BNB").address,
      to: getTokenBySymbol(CHAIN_ID, "BNB").address,
    },
    [SHORT]: {
      from: getTokenBySymbol(CHAIN_ID, "BUSD").address,
      to: getTokenBySymbol(CHAIN_ID, "BTC").address,
    }
  })

  const [fromTokenAddress, setFromTokenAddress] = useState(tokenSelection[SWAP].from)
  const [toTokenAddress, setToTokenAddress] = useState(tokenSelection[SWAP].to)

  const [swapOption, setSwapOption] = useState(SWAP)

  const { connector, activate, active, account, library, chainId } = useWeb3React()
  const [activatingConnector, setActivatingConnector] = useState()
  useEffect(() => {
    if (activatingConnector && activatingConnector === connector) { setActivatingConnector(undefined) }
  }, [activatingConnector, connector])
  const triedEager = useEagerConnect()
  useInactiveListener(!triedEager || !!activatingConnector)
  const connectWallet = async () => { activate(getInjectedConnector(), (e) => { toast.error(e.toString()) }) }

  const vaultAddress = getContract(CHAIN_ID, "Vault")
  const readerAddress = getContract(CHAIN_ID, "Reader")

  const prevAccount = usePrevious(account)
  useEffect(() => {
    if (prevAccount !== account) {
      setPendingTxns([])
    }
  }, [prevAccount, account])

  const whitelistedTokenAddresses = whitelistedTokens.map(token => token.address)
  const { data: vaultTokenInfo, mutate: updateVaultTokenInfo } = useSWR([active, readerAddress, "getVaultTokenInfo"], {
    fetcher: fetcher(library, Reader, [vaultAddress, NATIVE_TOKEN_ADDRESS, expandDecimals(1, 18), whitelistedTokenAddresses]),
  })
  const tokenAddresses = tokens.map(token => token.address)
  const { data: tokenBalances, mutate: updateTokenBalances } = useSWR([active, readerAddress, "getTokenBalances", account], {
    fetcher: fetcher(library, Reader, [tokenAddresses]),
  })
  const { data: positionData, mutate: updatePositionData } = useSWR([active, readerAddress, "getPositions", vaultAddress, account], {
    fetcher: fetcher(library, Reader, [positionQuery.collateralTokens, positionQuery.indexTokens, positionQuery.isLong]),
  })
  const { data: fundingRateInfo, mutate: updateFundingRateInfo } = useSWR([active, readerAddress, "getFundingRates"], {
    fetcher: fetcher(library, Reader, [vaultAddress, NATIVE_TOKEN_ADDRESS, whitelistedTokenAddresses]),
  })
  const { data: maxUsdg, mutate: updateMaxUsdg } = useSWR([active, vaultAddress, "getMaxUsdgAmount"], {
    fetcher: fetcher(library, Vault),
  })

  let reducedMaxUsdg
  if (maxUsdg) {
    reducedMaxUsdg = maxUsdg // maxUsdg.mul(99).div(100)
  }

  useEffect(() => {
    const checkPendingTxns = async () => {
      const updatedPendingTxns = []
      for (let i = 0; i < pendingTxns.length; i++) {
        const pendingTxn = pendingTxns[i]
        const receipt = await library.getTransactionReceipt(pendingTxn.hash)
        if (receipt) {
          if (receipt.status === 0) {
            const txUrl = getExplorerUrl(CHAIN_ID) + "tx/" + pendingTxn.hash
            toast.error(
              <div>
                Txn failed. <a href={txUrl} target="_blank" rel="noopener noreferrer">View</a>
                <br />
              </div>
            )
          }
          if (receipt.status === 1 && pendingTxn.message) {
            const txUrl = getExplorerUrl(CHAIN_ID) + "tx/" + pendingTxn.hash
            toast.success(
              <div>
                {pendingTxn.message}. <a href={txUrl} target="_blank" rel="noopener noreferrer">View</a>
                <br />
              </div>
            )
          }
          continue
        }
        updatedPendingTxns.push(pendingTxn)
      }

      if (updatedPendingTxns.length !== pendingTxns.length) {
        setPendingTxns(updatedPendingTxns)
      }
    }

    const interval = setInterval(() => {
      checkPendingTxns()
    }, 2 * 1000)
    return () => clearInterval(interval);
  }, [library, pendingTxns])

  useEffect(() => {

    if (active) {
      library.on('block', () => {
        updateVaultTokenInfo(undefined, true)
        updateTokenBalances(undefined, true)
        updatePositionData(undefined, true)
        updateFundingRateInfo(undefined, true)
        updateMaxUsdg(undefined, true)
      })
      return () => {
        library.removeAllListeners('block')
      }
    }
  }, [active, library, updateVaultTokenInfo,
    updateTokenBalances, updatePositionData,
    updateFundingRateInfo, updateMaxUsdg])

  const infoTokens = getInfoTokens(tokens, tokenBalances, whitelistedTokens, vaultTokenInfo, fundingRateInfo)
  const { positions, positionsMap } = getPositions(positionQuery, positionData, infoTokens)

  return (
    <div className="Exchange">
      <div className="Exchange-top">
        <ExchangeChart
          fromTokenAddress={fromTokenAddress}
          toTokenAddress={toTokenAddress}
          infoTokens={infoTokens}
          swapOption={swapOption}
        />
        <SwapBox
          chainId={chainId}
          infoTokens={infoTokens}
          active={active}
          connectWallet={connectWallet}
          library={library}
          account={account}
          positionsMap={positionsMap}
          fromTokenAddress={fromTokenAddress}
          setFromTokenAddress={setFromTokenAddress}
          toTokenAddress={toTokenAddress}
          setToTokenAddress={setToTokenAddress}
          swapOption={swapOption}
          setSwapOption={setSwapOption}
          maxUsdg={reducedMaxUsdg}
          pendingTxns={pendingTxns}
          setPendingTxns={setPendingTxns}
          tokenSelection={tokenSelection}
          setTokenSelection={setTokenSelection}
        />
      </div>
      <div className="Exchange-bottom">
        <div className="Exchange-bottom-header">
          <div className={cx("Exchange-bottom-header-item", { active: isPositionsListVisible })} onClick={() => setIsPositionsListVisible(true)}>Positions</div>
          <div className={cx("Exchange-bottom-header-item", { active: !isPositionsListVisible })} onClick={() => setIsPositionsListVisible(false)}>Trade History</div>
        </div>
        {isPositionsListVisible &&
          <PositionsList
            positions={positions}
            positionsMap={positionsMap}
            infoTokens={infoTokens}
            active={active}
            account={account}
            library={library}
            pendingTxns={pendingTxns}
            setPendingTxns={setPendingTxns}
          />
        }
        {!isPositionsListVisible &&
          <TradeHistory
            account={account}
            infoTokens={infoTokens}
          />
        }
      </div>
      <div className="Exchange-footer">
        <a className="App-social-link" href="https://twitter.com/GambitProtocol" target="_blank" rel="noopener noreferrer">
          <FaTwitter />
        </a>
        <a className="App-social-link" href="http://gambitprotocol.medium.com" target="_blank" rel="noopener noreferrer">
          <FaMediumM />
        </a>
        <a className="App-social-link" href="https://github.com/xvi10" target="_blank" rel="noopener noreferrer">
          <FaGithub />
        </a>
        <a className="App-social-link" href="https://t.me/GambitProtocol" target="_blank" rel="noopener noreferrer">
          <FaTelegramPlane />
        </a>
      </div>
    </div>
  )
}
