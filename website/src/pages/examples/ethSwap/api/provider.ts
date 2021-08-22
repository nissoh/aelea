import { O, Op, fromCallback } from '@aelea/core'
import { observer } from "@aelea/ui-components"
import { Web3Provider } from "@ethersproject/providers"
import detectEthereumProvider from "@metamask/detect-provider"
import { awaitPromises, now, at, map, chain, recoverWith, continueWith, switchLatest, take } from "@most/core"
import { disposeWith } from "@most/disposable"
import { Stream } from "@most/types"

export enum CHAIN {
  ETH = 1,
  ETH_ROPSTEN = 3,
  ETH_KOVAN = 42,
  BSC = 56,
  BSC_TESTNET = 97
}

export const EXPLORER_URL = {
  [CHAIN.ETH]: "https://etherscan.io/",
  [CHAIN.ETH_KOVAN]: "https://kovan.etherscan.io/",
  [CHAIN.ETH_ROPSTEN]: "https://ropsten.etherscan.io/",
  [CHAIN.BSC]: "https://bscscan.com/",
  [CHAIN.BSC_TESTNET]: "https://testnet.bscscan.com/",
} as const


export type InitWalletProvider = {
  w3p: Web3Provider;
  metamask: any;
}



export const provider = awaitPromises(
  map(async () => {
    const metamask: any | null = await detectEthereumProvider()

    if (metamask === null) {
      throw new Error('No provider')
    }

    const w3p = new Web3Provider(metamask)

    return { w3p, metamask } as InitWalletProvider
  }, now(null))
)

// TODO(await fix) ATM recovering from provider failure is not possible with metamask
export const awaitProvider: typeof provider = observer.duringWindowActivity(
  recoverWith(err => {
    console.error(err)
    return chain(() => awaitProvider, at(3000, null))
  }, provider)
)

export const noProviderAlert: Stream<Error> = recoverWith(error => now(error), provider)


export const providerAction = <T>(interval: number, actionOp: Op<InitWalletProvider, Promise<T>>) => {
  const tx: Stream<T> = O(
    actionOp,
    take(1),
    awaitPromises,
    recoverWith(err => {
      console.error(err)
      return switchLatest(at(1500, tx))
    }),
    continueWith(() => {
      return switchLatest(at(interval, tx))
    }),
  )(awaitProvider)
  return observer.duringWindowActivity(tx)
}

export const metamaskEvent = <A>(eventName: string): Stream<A> => switchLatest(
  map(provider => {
    const eventChange = fromCallback(cb => {
      provider.metamask.on(eventName, cb)
      return disposeWith(() => provider.metamask.removeListener(eventName, cb), null)
    })

    return O(
    )(eventChange)
  }, awaitProvider)
)
