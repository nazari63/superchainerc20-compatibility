import { fetchAllChains } from '@/config/chains'
import { useQuery } from '@tanstack/react-query'

const queryParams = {
  queryKey: ['fetchAllChains'],
  queryFn: async () => await fetchAllChains(),
  staleTime: Infinity,
}

export const useAllChains = () => {
  return useQuery(queryParams)
}
const networks = [
  { name: 'mainnet', sourceId: 1 },
  { name: 'sepolia', sourceId: 11155111 },
  { name: 'supersim', sourceId: 900 },
] as const

export const useAllChainsByNetwork = () => {
  return useQuery({
    ...queryParams,
    select: (chains) => {
      return Object.fromEntries(
        networks.map((network) => {
          return [
            network.name,
            chains.filter((chain) => chain.sourceId === network.sourceId),
          ]
        }),
      )
    },
  })
}
