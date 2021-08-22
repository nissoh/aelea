import { ethContracts } from "./api/contract"
import { $eth, $usdt, $xrd, $sushi } from "./$elements"
import { SYMBOL } from "./api/address/symbol"
import { Token } from "./types"
import { Contract } from "@ethersproject/contracts"


export const tokenList: Token<Contract>[]= [
  {  contract: ethContracts.MAINCHAIN, label: 'Ethereum', symbol: SYMBOL.ETH },
  {  contract: ethContracts.USDT, label: 'Tether', symbol: SYMBOL.USDT },
  {  contract: ethContracts.SUSHI, label: 'Sushi', symbol: SYMBOL.SUSHI },
  {  contract: ethContracts.EXRD, label: 'e-Radix', symbol: SYMBOL.EXRD },
]