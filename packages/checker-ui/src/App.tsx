import { useState } from 'react'

import {
  checkSupportsERC7802Interface,
  allowsSuperchainTokenBridgeToMint,
  emitsCrosschainMintEvent,
  CheckResult,
  checkIsContractDeployed,
} from '@superchainerc20-compatibility/checks'
import { Providers } from '@/Providers'
import {
  useQueries,
  QueryObserverResult,
  useQueryClient,
} from '@tanstack/react-query'
import { Address as zodAddress } from 'abitype/zod'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Address, Chain } from 'viem'
import { fromZodError } from 'zod-validation-error'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAllChainsByNetwork } from '@/config/queryAllChains'
import { useNavigate, useSearchParams, createSearchParams } from 'react-router'

const address = '0xAaA2b0D6295b91505500B7630e9E36a461ceAd1b' as const

const checkQueriesForChain = (chain: Chain, address: Address) => [
  {
    queryKey: ['contract-is-deployed', chain.id, address],
    queryFn: () => checkIsContractDeployed({ chain }, address),
    meta: {
      queryKey: ['contract-is-deployed', chain.id, address],
      chainId: chain.id,
      title: 'Contract is deployed',
      description: 'Contract is deployed',
    },
  },

  {
    queryKey: ['erc7802-compatibility', chain.id, address],
    queryFn: () => checkSupportsERC7802Interface({ chain }, address),
    meta: {
      queryKey: ['erc7802-compatibility', chain.id, address],
      chainId: chain.id,
      title: 'ERC-7802 Compatibility',
      description: 'ERC-7802 Compatibility',
    },
  },
  {
    queryKey: ['bridge-minting', chain.id, address],
    queryFn: async () => {
      return allowsSuperchainTokenBridgeToMint({ chain }, address)
    },
    meta: {
      queryKey: ['bridge-minting', chain.id, address],
      chainId: chain.id,
      title: 'SuperchainTokenBridge can mint',
      description: 'SuperchainTokenBridge can mint',
    },
  },
  {
    queryKey: ['crosschain-mint-event', chain.id, address],
    queryFn: () => emitsCrosschainMintEvent({ chain }, address),
    meta: {
      queryKey: ['crosschain-mint-event', chain.id, address],
      chainId: chain.id,
      title: 'Token emits correct CrosschainMint event',
      description: 'Token emits correct CrosschainMint event',
    },
  },
]

const useChecks = (chains: Chain[], address: Address) => {
  const queryClient = useQueryClient()
  const queries = chains.flatMap((chain) =>
    checkQueriesForChain(chain, address),
  )

  const queryCountPerChain = queries.length / chains.length
  const queryResults = useQueries({
    queries: queries,
  })

  const zipped = queries.map((query, index) => ({
    ...queryResults[index],
    meta: query.meta,
  }))

  const resultsByChainId = chains.reduce(
    (acc, chain, chainIndex) => {
      const queriesForChain = zipped.slice(
        chainIndex * queryCountPerChain,
        (chainIndex + 1) * queryCountPerChain,
      )
      acc[chain.id] = {
        success: queriesForChain.every((result) => result.data?.success),
        results: queriesForChain,
        isLoading: queriesForChain.some((result) => result.isLoading),
        isError: queriesForChain.some((result) => result.isError),
        refetch: () =>
          queriesForChain.forEach((result) => {
            queryClient.resetQueries({
              queryKey: result.meta.queryKey,
            })
          }),
      }
      return acc
    },
    {} as Record<
      number,
      {
        success: boolean
        results: QueryObserverResult<CheckResult>[]
        isLoading: boolean
        isError: boolean
        refetch: () => void
      }
    >,
  )

  return {
    refetch: () =>
      zipped.forEach((result) => {
        queryClient.resetQueries({
          queryKey: result.meta.queryKey,
        })
      }),
    isLoading: queryResults.some((result) => result.isLoading),
    isError: queryResults.some((result) => result.isError),
    resultsByChainId,
  }
}

const ChainChecks = ({
  chain,
  results,
}: {
  chain: Chain
  results: {
    success: boolean
    results: QueryObserverResult<CheckResult>[]
    isLoading: boolean
    isError: boolean
    refetch: () => void
  }
}) => {
  return (
    <AccordionItem value={chain.name}>
      <AccordionTrigger className="px-6">
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">{chain.name}</span>
            <span className="text-sm text-muted-foreground">({chain.id})</span>
          </div>

          <div className="flex items-center gap-2">
            {results.isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <span className="text-sm text-muted-foreground">
                  Checking...
                </span>
              </div>
            ) : results.isError ? (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <span className="text-sm text-amber-600">Error</span>
              </div>
            ) : results.success ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-sm text-green-600">
                  All checks passed
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="text-sm text-red-600">Some checks failed</span>
              </div>
            )}
          </div>
        </div>
      </AccordionTrigger>

      <AccordionContent>
        <div className="px-6 pb-4 space-y-6 divide-y">
          {results.results.map((result, index) => (
            <div key={index} className={index === 0 ? 'pt-2' : 'pt-6'}>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-1">
                    {result.isLoading && (
                      <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                    )}
                    {!result.isLoading &&
                      !result.error &&
                      result.data?.success && (
                        <CheckCircle2 className="text-green-600 h-5 w-5" />
                      )}
                    {!result.isLoading &&
                      !result.error &&
                      !result.data?.success && (
                        <XCircle className="text-red-600 h-5 w-5" />
                      )}
                    {!result.isLoading && result.error && (
                      <AlertCircle className="text-amber-600 h-5 w-5" />
                    )}
                  </div>

                  <div className="space-y-2 flex-grow min-w-0">
                    <h3 className="font-medium">{result.meta?.title}</h3>
                    <p className="text-sm text-slate-600">
                      {result.meta?.description}
                    </p>

                    {result.error && (
                      <p className="text-sm text-amber-700 bg-amber-50 rounded-md p-3 break-all whitespace-normal overflow-hidden">
                        {result.error.message}
                      </p>
                    )}

                    {!result.error && result.data?.success && (
                      <p className="text-sm text-green-700 bg-green-50 rounded-md p-3 break-all whitespace-normal overflow-hidden">
                        {result.data.message}
                      </p>
                    )}

                    {!result.error && result.data && !result.data.success && (
                      <p className="text-sm text-red-700 bg-red-50 rounded-md p-3 break-all whitespace-normal overflow-hidden">
                        {result.data.reason}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

interface CheckerParams {
  address: Address | null
  network: string | null
  chainIds: number[]
}

const useCheckerParams = (): CheckerParams => {
  const [searchParams] = useSearchParams()

  return {
    address: searchParams.get('address') as Address | null,
    network: searchParams.get('network'),
    chainIds: searchParams.get('chainIds')?.split(',').map(Number) || [],
  }
}

const Checks = () => {
  const { data: chainsByNetwork } = useAllChainsByNetwork()
  const { address, network, chainIds } = useCheckerParams()

  const chains =
    network && chainsByNetwork
      ? chainsByNetwork[network].filter((chain) => chainIds.includes(chain.id))
      : []

  const checksResult = useChecks(chains, address!)

  if (!address || !network || !chainIds.length) {
    return null
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Compatibility Results</CardTitle>
          <CardDescription>
            Expand each chain to see detailed results
          </CardDescription>
        </div>
        <Button
          size="sm"
          onClick={() => checksResult.refetch()}
          disabled={checksResult.isLoading}
          variant="outline"
        >
          {checksResult.isLoading && (
            <Loader2 className="h-3 w-3 animate-spin mr-2" />
          )}
          Recheck All
        </Button>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
          {chains.map((chain) => (
            <ChainChecks
              key={chain.id}
              chain={chain}
              results={checksResult.resultsByChainId[chain.id]}
            />
          ))}
        </Accordion>
      </CardContent>
    </Card>
  )
}

const Inner = () => {
  const navigate = useNavigate()
  const { data: chainsByNetwork } = useAllChainsByNetwork()
  const {
    address: urlAddress,
    network: urlNetwork,
    chainIds,
  } = useCheckerParams()

  const [error, setError] = useState<string | null>(null)
  const [address, setAddress] = useState(
    urlAddress || '0xAaA2b0D6295b91505500B7630e9E36a461ceAd1b',
  )
  const [selectedNetwork, setSelectedNetwork] = useState<string>(
    urlNetwork || '',
  )
  const [selectedChainIds, setSelectedChainIds] = useState<number[]>(
    chainIds || [],
  )

  const [addressToCheck, setAddressToCheck] = useState<Address | null>(null)
  const [chainsToCheck, setChainsToCheck] = useState<Chain[]>([])

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedChainIds.length === 0) {
      setError('Please select at least one chain')
      return
    }

    const result = zodAddress.safeParse(address)
    if (result.success) {
      setAddressToCheck(result.data)
      setError(null)

      navigate({
        pathname: '/',
        search: createSearchParams({
          address: result.data,
          network: selectedNetwork,
          chainIds: selectedChainIds.join(','),
        }).toString(),
      })
    } else {
      setError(fromZodError(result.error).message)
    }
  }

  // Add this helper function to compare current form state with URL params
  const hasParamsChanged = () => {
    const addressChanged = address !== urlAddress
    const networkChanged = selectedNetwork !== urlNetwork
    const chainsChanged =
      selectedChainIds.length !== chainIds.length ||
      !selectedChainIds.every((id) => chainIds.includes(id))

    return addressChanged || networkChanged || chainsChanged
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>SuperchainERC20 Checker</CardTitle>
            <CardDescription>
              Verify if your ERC20 token implementation is compatible with the
              Superchain bridge
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-4">
                <label className="text-sm font-medium">Select Network</label>
                <Select
                  value={selectedNetwork}
                  onValueChange={(value) => {
                    setSelectedNetwork(value)
                    setSelectedChainIds([])
                    setChainsToCheck([])
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a network" />
                  </SelectTrigger>
                  <SelectContent>
                    {chainsByNetwork &&
                      Object.keys(chainsByNetwork).map((network) => (
                        <SelectItem key={network} value={network}>
                          {network.charAt(0).toUpperCase() + network.slice(1)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedNetwork && chainsByNetwork && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">Select Chains</label>
                    <div className="space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setSelectedChainIds(
                            chainsByNetwork[selectedNetwork].map(
                              (chain) => chain.id,
                            ),
                          )
                        }
                      >
                        Select All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedChainIds([])}
                      >
                        Select None
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {chainsByNetwork[selectedNetwork].map((chain) => (
                      <Button
                        key={chain.id}
                        variant={
                          selectedChainIds.includes(chain.id)
                            ? 'default'
                            : 'outline'
                        }
                        className="w-full justify-start"
                        onClick={() => {
                          setSelectedChainIds((prev) =>
                            prev.includes(chain.id)
                              ? prev.filter((id) => id !== chain.id)
                              : [...prev, chain.id],
                          )
                        }}
                      >
                        <span className="truncate">{chain.name}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <form
                onSubmit={handleAddressSubmit}
                className="flex flex-col gap-3"
              >
                <div className="flex gap-3">
                  <Input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter contract address"
                    className="flex-grow"
                  />
                  <Button
                    type="submit"
                    disabled={
                      selectedChainIds.length === 0 || !hasParamsChanged()
                    }
                  >
                    Check
                  </Button>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </form>
            </div>
          </CardContent>
        </Card>

        <Checks />
      </div>
    </div>
  )
}

function App() {
  return (
    <Providers>
      <Inner />
    </Providers>
  )
}

export default App
