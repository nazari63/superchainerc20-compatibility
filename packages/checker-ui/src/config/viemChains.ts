import * as chains from 'viem/chains'
import { Chain } from 'viem/chains'
import { supersimL2A, supersimL2B } from '@eth-optimism/viem'

export const viemChainById = {
  ...[supersimL2A, supersimL2B, ...Object.values(chains)].reduce(
    (acc, chain) => {
      acc[chain.id] = chain
      return acc
    },
    {} as Record<number, Chain>,
  ),
}
