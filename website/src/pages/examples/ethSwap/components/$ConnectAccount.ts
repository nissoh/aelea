import { $text, component, style, Behavior, $Node, $node, attr } from "@aelea/core"
import { $Button, $column, $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { combine, map, merge, switchLatest } from "@most/core"
import { network, account, requestAccounts } from "../api/account"
import { awaitProvider, CHAIN, noProviderAlert } from "../api/provider"
import { $wrapNativeElement } from "@aelea/core"
// @ts-ignore
import jazzicon from 'jazzicon'
import { $alert, $anchor } from "../../../../elements/$common"


export function $jazzicon(addres: string) {
  const cnt = parseInt(addres.slice(2, 10), 16)
  const el = jazzicon(24, cnt)
  return $wrapNativeElement(el)()
}



const $userConnectionStatus = (address: string) => {
  return $row(style({ backgroundColor: pallete.background, borderRadius: '12px', alignItems: 'center', overflow: 'hidden' }))(
    $row(style({ borderRadius: '12px', alignItems: 'center', padding: '0 10px' }))(
      $text(address.slice(0, 6) + '...' + address.slice(-4))
    ),
    $row(style({ backgroundColor: pallete.middleground, height: '40px', alignItems: 'center', padding: '0 6px' }))(
      $jazzicon(address)
    )
  )
}


const $accountAlert = (title: string, $description: $Node) => {
  return $alert(layoutSheet.column, layoutSheet.spacingTiny)(
    $text(style({ fontWeight: 'bold' }))(title),
    $column(style({ color: pallete.foreground, marginBottom: '6px' }))(
      $description
    )
  )
}


const $installMetamaskWarning = $accountAlert(
  'Metamask is missing',
  $node(
    $text('This demo uses metamask in order to connect with a crypto wallet. you can get it from '),
    $anchor(attr({ href: 'https://metamask.io/' }))(
      $text('https://metamask.io/')
    )
  )
)


export const $AccountConnectivity = () => component((
  [requestWallet, requestWalletTeter]: Behavior<any, any>
) => {

  const $connectButton = $Button({ $content: $text('Connect Wallet') })({
    click: requestWalletTeter(
      map(() => {
        return requestAccounts
      }),
      switchLatest
    ) 
  })


  const errorOrProvider = merge(noProviderAlert, awaitProvider)

  return [
    switchLatest(
      map(provider => {

        if (provider instanceof Error)
          return $installMetamaskWarning

        return switchLatest(
          combine((chain, account) => {
            if (account === undefined)
              return $connectButton


            if (chain !== CHAIN.ETH)
              return $accountAlert('Switch to Ethereum main network ', $text('Sending mainnet(ETH, BNB) tokens should be, other tokens are incompatible'))

            return $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
              $text(style({ color: pallete.foreground }))('Account: '),
              $userConnectionStatus(account)
            )
          }, network, account)
        )


      }, errorOrProvider)
    ),
    {
      account: requestWallet
    }
  ]
})


