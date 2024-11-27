import { Context } from '@/context'
import { CheckEventHandler } from '@/event'
import { Abi, Address, toHex, fromHex, toFunctionSelector } from 'viem'
import { IERC7802Abi } from '@/abi/IERC7802Abi'

const getInterfaceId = (abi: Abi) => {
  const selectors = abi
    .filter((item) => item.type === 'function')
    .map((item) => toFunctionSelector(item))

  const interfaceId = selectors.reduce((prev, curr) => {
    const prevNum = fromHex(prev, 'bigint')
    const currNum = fromHex(curr, 'bigint')
    return toHex(prevNum ^ currNum, { size: 4 })
  })

  return interfaceId
}

const ERC7802_INTERFACE_ID = getInterfaceId(IERC7802Abi)

export const checkSupportsInterface = async (
  context: Context,
  contractAddress: Address,
  onCheckEventUpdate: CheckEventHandler,
): Promise<Record<number, boolean>> => {
  const { chains, publicClientByChainId } = context

  const results = await Promise.all(
    chains.map(async (chain) => {
      const publicClient = publicClientByChainId[chain.id]

      try {
        const supportsERC7802 = await publicClient.readContract({
          address: contractAddress,
          abi: IERC7802Abi,
          functionName: 'supportsInterface',
          args: [ERC7802_INTERFACE_ID],
        })

        if (supportsERC7802) {
          onCheckEventUpdate({
            chainId: chain.id,
            event: 'success',
          })
        } else {
          onCheckEventUpdate({
            chainId: chain.id,
            event: 'failed',
            reason: `supportsInterface(${ERC7802_INTERFACE_ID}) returned false`,
          })
        }

        return supportsERC7802
      } catch (error) {
        onCheckEventUpdate({
          chainId: chain.id,
          event: 'error',
          error: error.message,
        })

        return false
      }
    }),
  )

  return results.reduce(
    (prev, curr, index) => {
      prev[chains[index].id] = curr
      return prev
    },
    {} as Record<number, boolean>,
  )
}
