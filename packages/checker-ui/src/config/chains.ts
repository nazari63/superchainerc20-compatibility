import { fetchSuperchainRegistryChains } from '@/superchain-registry/fetchSuperchainRegistryChains'
import { supersimL2A, supersimL2B } from '@eth-optimism/viem'

export const fetchAllChains = async () => {
  const superchainRegistryChains = await fetchSuperchainRegistryChains()
  const allChains = [...superchainRegistryChains, supersimL2A, supersimL2B]
  return allChains
}
