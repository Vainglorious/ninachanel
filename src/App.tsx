import { useEffect, useMemo, useState } from 'react'
import viteLogo from '/logo.png'
import loadingGif from '/loading.gif'
import './App.css'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { FaInstagram, FaXTwitter, FaArrowLeft, FaArrowRight } from 'react-icons/fa6'
import { SiOpensea } from 'react-icons/si'
import { ethers } from 'ethers'
import { useAccount, useDisconnect, usePublicClient } from 'wagmi'

import contractAbi from './contract.json'

const contractAddress = '0x670d4dd2e6badfbbd372d0d37e06cd2852754a04'
const assetsURL = 'https://ninachanel-bucket.s3.us-east-1.amazonaws.com/'
const ID_MIN = 0
const ID_MAX = 5079
const TOTAL_SUPPLY = ID_MAX - ID_MIN + 1

export default function App() {
  const publicClient: any = usePublicClient()
  const provider = useMemo(() => new ethers.BrowserProvider(publicClient.transport), [publicClient])
  const contract = useMemo(() => new ethers.Contract(contractAddress, contractAbi, provider), [provider])

  const { isConnected, address } = useAccount()
  const { disconnect } = useDisconnect();

  // Only show tokens the user owns
  const [isFound, setIsFound] = useState<boolean>(true)
  const [ownedIds, setOwnedIds] = useState<string[]>([])
  const [cursor, setCursor] = useState(0) // index within ownedIds

  // Derived state
  const id = ownedIds.length > 0 ? ownedIds[cursor] : ''
  const [owner, setOwner] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [status, setStatus] = useState<string>('')
  const [progress, setProgress] = useState<string>('')
  const [searchId, setSearchId] = useState<string>('')

  const shortAddr = (a?: string | null) => (a ? a.slice(0, 6) + '…' + a.slice(-4) : '')

  // ===== Scan ownerOf for the whole collection (0..5079) in chunks =====
  async function loadOwnedTokensByScanning() {
    setStatus('Scanning collection…')
    setProgress('')
    setOwnedIds([])
    setCursor(0)
    setOwner(null)

    if (!isConnected || !address) {
      setStatus('Connect a wallet to load your tokens')
      return
    }

    let cancelled = false
    // simple cancellation on unmount / re-run
    const cancel = () => {
      cancelled = true
    }

    const lower = address.toLowerCase()
    const results: string[] = []

    // Use viem's multicall via publicClient for efficiency
    const CHUNK = 200 // number of tokenIds per multicall batch

    try {
      for (let start = ID_MIN; start <= ID_MAX; start += CHUNK) {
        const size = Math.min(CHUNK, ID_MAX - start + 1)
        const contracts = Array.from({ length: size }, (_, i) => ({
          address: contractAddress as `0x${string}`,
          // @ts-ignore - ABI type loosened for brevity in this example
          abi: contractAbi,
          functionName: 'ownerOf',
          args: [BigInt(start + i)],
        }))

        const res = await publicClient.multicall({ contracts, allowFailure: true })

        res.forEach((r: any, idx: number) => {
          if (r.status === 'success') {
            const o = String(r.result).toLowerCase()
            if (o === lower) results.push(String(start + idx))
            // if (Math.random() > 0.99) results.push(String(start + idx))
          }
        })

        if (cancelled) return
        setProgress(`Scanned ${Math.min(start + size - ID_MIN, TOTAL_SUPPLY)} / ${TOTAL_SUPPLY}`)
      }
      if (cancelled) return
      setOwnedIds(results)
      setIsFound(results.length !== 0)
      setCursor(0)
      setStatus(results.length ? '' : 'No tokens owned by this wallet')
      setProgress('')
    } catch (e: any) {
      if (cancelled) return
      setStatus(`Scan failed: ${e.message ?? e}`)
      setProgress('')
    }

    return cancel
  }

  // Trigger scan on connect/address change
  useEffect(() => {
    let cancelled = false;
    setIsFound(true);
    (async () => {
      if (!isConnected || !address) {
        setOwnedIds([])
        setCursor(0)
        setStatus('Connect a wallet to load your tokens')
        return
      }
      await loadOwnedTokensByScanning()
    })()
    return () => {
      cancelled = true
    }
  }, [isConnected, address])

  // Keep image url + owner synced with current id
  useEffect(() => {
    if (!id) {
      setImageUrl('')
      setOwner(null)
      return
    }
    setImageUrl(`${assetsURL}svg/${id}.svg`)
    setSearchId(id)
    let cancelled = false
      ; (async () => {
        try {
          const res: string = await contract.ownerOf(id)
          if (cancelled) return
          setOwner(res)
        } catch (e) {
          if (cancelled) return
          setOwner(null)
        }
      })()

    return () => {
      cancelled = true
    }
  }, [id, contract])

  const handlePrev = () => {
    if (ownedIds.length === 0) return
    setCursor((c) => (c - 1 + ownedIds.length) % ownedIds.length)
    setSearchId(id)
  }

  const handleNext = () => {
    if (ownedIds.length === 0) return
    setCursor((c) => (c + 1) % ownedIds.length)
    setSearchId(id)
  }

  const download = async (ext: 'svg' | 'png') => {
    if (!id) return
    try {
      const url = `${assetsURL}${ext}/${id}.${ext}`
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        headers: { 'Content-Type': 'application/octet-stream' },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const blob = await response.blob()
      const objectUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = `${id}.${ext}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(objectUrl)
      document.body.removeChild(a)
    } catch (error) {
      alert(`Failed to download ${ext.toUpperCase()}: ${(error as Error).message}`)
    }
  }

  const handleIDInput = (e: any) => {
    const value = e.target.value;
    if (value === '') {
      setSearchId('');
      return;
    }

    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      if (num < 0) {
        setSearchId(id); // clamp to 0
      } else if (num > 5079) {
        setSearchId("5079"); // clamp to max
      } else {
        setSearchId(num + "");
      }
    }
  }

  const handleSearchID = () => {
    const found = ownedIds.indexOf(searchId);
    if (found != -1) {
      setCursor(found)
    } else {
      setSearchId(id)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br text-gray-900">
      {/* HEADER */}
      <header className="w-full border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="px-10 pt-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={viteLogo} alt="Super Cool World" className="h-20 w-auto" />
          </div>
          <nav className="hidden md:flex gap-6 text-gray-600 font-medium">
            {
              isConnected ?
                <div className="max-w-2xl">
                  <ConnectButton.Custom>
                    {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
                      return (
                        <span
                          onClick={account ? openAccountModal : openConnectModal}
                          className="flex items-center gap-2 text-gray-900 px-3 py-2 rounded hover:text-black transition cursor-pointer font-medium"
                        >
                          Disconnect Wallet <FaArrowRight />
                        </span>
                      );
                    }}
                  </ConnectButton.Custom>
                </div> : <></>
            }
          </nav>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center space-y-6">
        {!isConnected ? (
          <div className="max-w-2xl">
            <ConnectButton.Custom>
              {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
                return (
                  <span
                    onClick={account ? openAccountModal : openConnectModal}
                    className="flex items-center gap-2 text-gray-900 px-3 py-2 text-3xl rounded hover:text-black transition cursor-pointer"
                  >
                    Connect Wallet <FaArrowRight className="text-3xl pt-1" />
                  </span>
                );
              }}
            </ConnectButton.Custom>
          </div>
        ) : (
          <>
            {
              isFound ?
                <>
                  {
                    status === 'Scanning collection…' ?
                      <img src={loadingGif} className="h-20 w-auto" alt="Loading..." /> :
                      <>
                        {/* Ownership status / instructions */}
                        <div className="text-sm text-gray-900 min-h-[1.5rem]">
                          {status && <span>{status}</span>}
                          {!status && ownedIds.length > 0 && (
                            <span>
                              Showing {cursor + 1} of {ownedIds.length} owned tokens
                            </span>
                          )}
                          {progress && (
                            <div className="text-xs text-gray-500 mt-1">{progress}</div>
                          )}
                        </div>

                        <div className="flex items-center space-x-4 mb-2">
                          <button className="text-gray-900 hover:text-black" onClick={handlePrev} disabled={ownedIds.length === 0}>
                            <FaArrowLeft className="hover:text-black transition-colors text-3xl" />
                          </button>

                          <div className="relative w-74 h-74 bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
                            {!id ? (
                              <span className="text-gray-900 text-lg font-medium"></span>
                            ) : (
                              <img src={imageUrl} alt={`Token ${id}`} className="absolute inset-0 object-cover w-full h-full" />
                            )}
                          </div>

                          <button className="text-gray-900 hover:text-black" onClick={handleNext} disabled={ownedIds.length === 0}>
                            <FaArrowRight className="hover:text-black transition-colors text-3xl" />
                          </button>
                        </div>

                        {/* Owner row */}
                        {id && (
                          <div className="text-sm text-gray-900">
                            Owner: <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{shortAddr(owner)}</span> {owner && address && owner.toLowerCase() === address.toLowerCase() && (
                              <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Owned by you</span>
                            )}
                          </div>
                        )}

                        {/* Search Bar */}
                        <div className="mt-4">
                          <input
                            className="w-74 flex-grow px-4 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ease-in-out"
                            type="number"
                            min={0}
                            max={5079}
                            value={searchId}
                            placeholder="Search by token ID…"
                            onChange={(e) => handleIDInput(e)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault(); // optional, prevent form submit
                                handleSearchID();
                              }
                            }}
                          />
                        </div>


                        {/* Actions */}
                        <div className="flex items-center gap-3 mt-5">
                          <button
                            className="bg-black text-white px-3 py-2 rounded hover:bg-gray-800 active:bg-gray-900 transition"
                            onClick={() => download('svg')}
                            disabled={!id}
                          >
                            Download SVG
                          </button>
                          <button
                            className="bg-black text-white px-3 py-2 rounded hover:bg-gray-800 active:bg-gray-900 transition"
                            onClick={() => download('png')}
                            disabled={!id}
                          >
                            Download PNG
                          </button>
                        </div>
                      </>
                  }
                </> :
                <div className="max-w-2xl">
                  <span
                    className="flex items-center gap-2 text-gray-900 px-3 py-2 text-3xl rounded hover:text-black transition cursor-pointer"
                  >
                    No Super Cool Assets Found
                  </span>
                </div>
            }
          </>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-white/80 backdrop-blur-md">
        <div className="px-10 py-6 flex flex-col md:flex-row items-center justify-end gap-4">
          <div className="flex gap-4 text-2xl text-gray-900">
            <a href="https://opensea.io/collection/super-cool-world" target="_blank" rel="noreferrer">
              <SiOpensea className="hover:text-blue-500 transition-colors text-5xl" />
            </a>
            <a href="https://www.instagram.com/ninachanel/" target="_blank" rel="noreferrer">
              <FaInstagram className="hover:text-pink-500 transition-colors text-5xl" />
            </a>
            <a href="https://x.com/ninachanel" target="_blank" rel="noreferrer">
              <FaXTwitter className="hover:text-black transition-colors text-5xl" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}