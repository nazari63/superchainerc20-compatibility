import { viemChainById } from '@/config/viemChains'
import { Chain, defineChain } from 'viem'
import { mainnet, sepolia } from 'viem/chains'
import { chainConfig } from 'viem/op-stack'
import { z } from 'zod'

const zodSupportedNetwork = z.enum(['mainnet', 'sepolia', 'sepolia-dev-0'])

const CHAIN_LIST_URL =
  'https://raw.githubusercontent.com/ethereum-optimism/superchain-registry/refs/heads/main/chainList.json'

const zodIdentifier = z.string().refine(
  (val): val is `${string}/${string}` => {
    const parts = val.split('/')
    const [prefix, suffix] = parts
    if (!prefix || !suffix) {
      return false
    }
    return prefix.length > 0 && suffix.length > 0
  },
  {
    message:
      "Identifier must be in the format 'prefix/suffix' with non-empty parts",
  },
)

const zodChainListItem = z.object({
  name: z.string(),
  identifier: zodIdentifier,
  chainId: z.number(),
  rpc: z.array(z.string()),
  explorers: z.array(z.string()),
  parent: z.object({
    type: z.literal('L2'),
    chain: zodSupportedNetwork,
  }),
})

const zodChainList = z.array(zodChainListItem)
const zodChainListResponse = z.array(zodChainListItem)
type SupportedNetwork = z.infer<typeof zodSupportedNetwork>

type ChainListItem = z.infer<typeof zodChainListItem>
type ChainList = z.infer<typeof zodChainList>

const fetchChainList = async (chainListURL: string) => {
  const response = await fetch(chainListURL)
  if (!response.ok) {
    throw new Error(`Failed to fetch chain list: ${response.statusText}`)
  }

  const chainListJson = await response.json()

  const parsedChainList = zodChainListResponse.parse(chainListJson)

  return parsedChainList.filter(
    (chain) =>
      chain.parent.chain === 'mainnet' || chain.parent.chain === 'sepolia',
  )
}

const chainListItemToChain = (config: ChainListItem): Chain => {
  const stringId = config.identifier.split('/')[1] as string

  const isMainnet = config.parent.chain === 'mainnet'

  if (viemChainById[config.chainId]) {
    return viemChainById[config.chainId]
  }

  // TODO: Does not support custom gas tokens
  return defineChain({
    ...chainConfig,
    id: config.chainId,
    name: stringId,
    sourceId: isMainnet ? mainnet.id : sepolia.id,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorers: {
      default: {
        name: 'Blockscout',
        url: config.explorers[0] as string,
      },
    },
    rpcUrls: {
      default: {
        http: [config.rpc[0] as string],
      },
    },
    multicall: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
    },
  })
}

export const fetchSuperchainRegistryChains = async () => {
  console.log('fetching')
  const chainList = await fetchChainList(CHAIN_LIST_URL)
  const result = chainList.map(chainListItemToChain)
  console.log({ result })
  return result
}
