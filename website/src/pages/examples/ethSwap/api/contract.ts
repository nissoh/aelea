import { awaitPromises, combine, map, skipRepeatsWith, switchLatest } from "@most/core"
import { account } from "./account"
import { awaitProvider, CHAIN, metamaskEvent, providerAction } from "./provider"
import { Provider } from "@ethersproject/providers"
import { Address } from "./types"
import { fromCallback } from '@aelea/utils'
import { state } from "@aelea/ui-components"
import { Stream } from "@most/types"
import { EthExrd__factory, EthSushi__factory } from "./ethers-contracts"
import { SYMBOL } from "./address/symbol"
import { bnToHex, formatFixed } from "./utils"
import { BigNumber } from "@ethersproject/bignumber"
import { Contract, ContractTransaction } from "@ethersproject/contracts"
import { Signer } from "@ethersproject/abstract-signer"
import { AddressZero } from "./address/token"
import { ETH_CONTRACT } from "./address/contract"

const UPDATE_CONTRACT_INTERVAL = 1350

const formatBN = map((bnb: BigNumber) => formatFixed(bnb.toBigInt()))
const skipRepeatedBns = skipRepeatsWith((bn1: BigNumber, bn2: BigNumber) => bn1.eq(bn2))
export const mainchainBalance = providerAction(UPDATE_CONTRACT_INTERVAL, combine(async (accountHash, provider) => provider.w3p.getBalance(accountHash), account))
export const mainchainBalanceReadable = formatBN(mainchainBalance)

export interface IContractBase<T extends Contract> {
  address: string

  balance: Stream<BigNumber>
  balanceReadable: Stream<string>

  contract: Stream<T>
  listen: <A extends any[]>(eventName: string) => Stream<A>
}

export interface IContract<T extends Contract> extends IContractBase<T> {
  transfer(to: string, amount: bigint): Stream<ContractTransaction | string>
}



type ConnectFactoryFn<T extends Contract> = (address: Address, signerOrProvider: Signer | Provider) => T

function baseActions<T extends Contract>(address: Address, contractFactory: ConnectFactoryFn<T>): IContractBase<T> {

  const contract = map(provider => {

    const signer = provider.w3p.getSigner()

    return contractFactory(address, signer)
  }, awaitProvider)

  const listen = (eventName: string) => switchLatest(
    map(({ contract }) => {
      return fromCallback(cb => {
        contract.on(eventName, cb)

        return () => contract.off(eventName, cb)
      })
    }, accountAndContract)
  )

  const accountAndContract = state.combineState({ contract, account })

  const balanceSource = combine(async ({ contract, account }) => {
    return contract.balanceOf(account)
  }, accountAndContract)

  const balance = skipRepeatedBns(providerAction(UPDATE_CONTRACT_INTERVAL, balanceSource))
  const balanceReadable = formatBN(balance)

  return { balance, balanceReadable, contract, address, listen }
}


export const ethContracts = {
  MAINCHAIN: {
    address: AddressZero,
    balance: skipRepeatedBns(mainchainBalance),
    balanceReadable: mainchainBalanceReadable,
    contract: null as any, // look into a way to make a compatible interface with mainnet
    listen: metamaskEvent,
    transfer(to: string, amount: bigint) {
      const accountAndContract = state.combineState({ provider: awaitProvider, account })
      const request = map(async (w3): Promise<string> => {
        // txHash is a hex string
        // As with any RPC call, it may throw an error
        // w3.provider.w3p.sendTransaction
        const txHash = await w3.provider.metamask.request({
          method: 'eth_sendTransaction',
          params: [
            { from: w3.account, to, value: bnToHex(amount) },
          ],
        })
        return txHash
      }, accountAndContract)

      const transferSignal = awaitPromises(request)
      return transferSignal
    }
  },
  [SYMBOL.EXRD]: {
    ...baseActions(ETH_CONTRACT[CHAIN.ETH].EXRD, EthExrd__factory.connect),
    address: ETH_CONTRACT[CHAIN.ETH].EXRD,
    transfer(to: string, amount: bigint) {
      const transferSignal = awaitPromises(map(cont => cont.transfer(to, BigNumber.from(amount)), this.contract))
      return transferSignal
    }
  },
  [SYMBOL.SUSHI]: {
    ...baseActions(ETH_CONTRACT[CHAIN.ETH].SUSHI, EthSushi__factory.connect),
    address: ETH_CONTRACT[CHAIN.ETH].SUSHI,
    transfer (to: string, amount: bigint) {
      const transferSignal = awaitPromises(map(cont => cont.transfer(to, BigNumber.from(amount)), this.contract))
      return transferSignal
    }
  },
  [SYMBOL.USDT]: {
    ...baseActions(ETH_CONTRACT[CHAIN.ETH].USDT, EthSushi__factory.connect),
    address: ETH_CONTRACT[CHAIN.ETH].USDT,
    transfer (to: string, amount: bigint) {
      const transferSignal = awaitPromises(map(cont => cont.transfer(to, BigNumber.from(amount)), this.contract))
      return transferSignal
    }
  },
} as const




