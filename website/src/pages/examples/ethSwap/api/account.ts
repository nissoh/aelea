import { O, fromCallback } from '@aelea/core'
import { awaitPromises, map, merge, switchLatest } from "@most/core"
import { disposeWith } from "@most/disposable"
import { Stream } from "@most/types"
import { awaitProvider, CHAIN, InitWalletProvider } from "./provider"
import { Address } from "./types"

const metamaskEvent = <A, B = unknown>(eventName: string, action: (a: Stream<[InitWalletProvider, A]>) => Stream<Promise<B>>) => switchLatest(
  map(provider => {
    const eventChange: Stream<A> = fromCallback(cb => {
      provider.metamask.on(eventName, cb)
      return disposeWith(() => provider.metamask.removeListener(eventName, cb), null)
    })

    return O(
      map((ev: A) => [provider, ev]),
      action,
      awaitPromises,
    )(eventChange)
  }, awaitProvider)
)

const networkChange = metamaskEvent<string, CHAIN>('chainChanged', map(async ([provider, _chainId]) => {
  // ethers.js does not support provider switch, hacky reload is required.. pffft
  window.location.reload()

  return (await provider.w3p.getNetwork()).chainId
}))
const initialNetwork = awaitPromises(map(async p => (await p.w3p.getNetwork()).chainId as CHAIN, awaitProvider))
export const network = merge(initialNetwork, networkChange)

const initialAccountList = awaitPromises(map(p => p.w3p.listAccounts(), awaitProvider))
const accountListChange = metamaskEvent<string, string[]>('accountsChanged', map(([provider, _accountHash]) => provider.w3p.listAccounts()))

export const accountList = merge(initialAccountList, accountListChange)
export const account: Stream<Address> = map(accountList => accountList[0], accountList)

export const requestAccounts: Stream<string[]> = awaitPromises(
  map(provider => {
    return provider.metamask.request({ method: 'eth_requestAccounts' })
  }, awaitProvider)
)

export const addEthereumChain = (chainId = '0x56'): Stream<string[]> => awaitPromises(
  map(provider => {
    return provider.metamask.request({
      method: 'wallet_addEthereumChain', params: [
        {
          chainId,
          chainName: 'Binance Smart Chain',
          nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
          rpcUrls: ['https://bsc-dataseed.binance.org/'],
          blockExplorerUrls: ['https://bscscan.com/']
        }
      ]
    })
  }, awaitProvider)
)


