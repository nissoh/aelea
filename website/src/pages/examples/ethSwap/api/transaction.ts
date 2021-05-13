import { map } from "@most/core"
import { providerAction } from "./provider"

export const getTxDetails = (txHash: string) => providerAction(350, map(w3 => w3.w3p.getTransactionReceipt(txHash)))

