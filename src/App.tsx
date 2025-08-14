import { useEffect, useMemo, useState } from 'react'
import viteLogo from '/vite.svg'
import './App.css'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { FaInstagram, FaXTwitter } from 'react-icons/fa6'
import { SiOpensea } from 'react-icons/si'
import { ethers } from 'ethers'
import { useAccount, usePublicClient } from 'wagmi'

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

  // Only show tokens the user owns
  const [ownedIds, setOwnedIds] = useState<string[]>([])
  const [cursor, setCursor] = useState(0) // index within ownedIds

  // Derived state
  const id = ownedIds.length > 0 ? ownedIds[cursor] : ''
  const [owner, setOwner] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [status, setStatus] = useState<string>('')
  const [progress, setProgress] = useState<string>('')

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
          }
        })

        if (cancelled) return
        setProgress(`Scanned ${Math.min(start + size - ID_MIN, TOTAL_SUPPLY)} / ${TOTAL_SUPPLY}`)
      }

      if (cancelled) return
      setOwnedIds(results)
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
    let cancelled = false
    ;(async () => {
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

    let cancelled = false
    ;(async () => {
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
  }

  const handleNext = () => {
    if (ownedIds.length === 0) return
    setCursor((c) => (c + 1) % ownedIds.length)
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

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900">
      {/* HEADER */}
      <header className="w-full border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={viteLogo} alt="Super Cool World" className="h-10 w-auto" />
            <span className="font-bold text-lg tracking-wide">Super Cool World</span>
          </div>
          <nav className="hidden md:flex gap-6 text-gray-600 font-medium">
            <ConnectButton />
          </nav>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center space-y-6">
        {!isConnected ? (
          <div className="max-w-2xl">
            <ConnectButton />
          </div>
        ) : (
          <>
            {/* Ownership status / instructions */}
            <div className="text-sm text-gray-700 min-h-[1.5rem]">
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
              <button className="text-3xl text-gray-700 hover:text-gray-900" onClick={handlePrev} disabled={ownedIds.length === 0}>
                &larr;
              </button>

              <div className="relative w-74 h-74 bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
                {!id ? (
                  <span className="text-gray-700 text-lg font-medium">No tokens found</span>
                ) : (
                  <img src={imageUrl} alt={`Token ${id}`} className="absolute inset-0 object-cover w-full h-full" />
                )}
              </div>

              <button className="text-3xl text-gray-700 hover:text-gray-900" onClick={handleNext} disabled={ownedIds.length === 0}>
                &rarr;
              </button>
            </div>

            {/* Owner row */}
            {id && (
              <div className="text-sm text-gray-700">
                Owner: <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{shortAddr(owner)}</span> {owner && address && owner.toLowerCase() === address.toLowerCase() && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Owned by you</span>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 mt-2">
              <button
                className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                onClick={loadOwnedTokensByScanning}
              >
                Rescan My Tokens
              </button>

              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                onClick={() => download('svg')}
                disabled={!id}
              >
                Download SVG
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                onClick={() => download('png')}
                disabled={!id}
              >
                Download PNG
              </button>
            </div>
          </>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">© {new Date().getFullYear()} Super Cool World. All rights reserved.</p>
          <div className="flex gap-4 text-2xl text-gray-700">
            <a href="https://opensea.io" target="_blank" rel="noreferrer">
              <SiOpensea className="hover:text-blue-500 transition-colors" />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer">
              <FaInstagram className="hover:text-pink-500 transition-colors" />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer">
              <FaXTwitter className="hover:text-black transition-colors" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}