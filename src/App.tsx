import { useEffect, useState } from 'react'
import viteLogo from '/vite.svg'
import './App.css'
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { FaInstagram, FaXTwitter } from "react-icons/fa6";
import { SiOpensea } from "react-icons/si";
import { ethers } from 'ethers';
import { useAccount, usePublicClient } from 'wagmi';

import contractAbi from './contract.json';
const contractAddress = '0x670d4dd2e6badfbbd372d0d37e06cd2852754a04';
const assetsURL = 'https://ninachanel-bucket.s3.us-east-1.amazonaws.com/';

function App() {
  const publicClient: any = usePublicClient();
  const provider = new ethers.BrowserProvider(publicClient.transport);
  const contract = new ethers.Contract(contractAddress, contractAbi, provider);

  const { isConnected, address } = useAccount();

  const [output, setOutput] = useState("");

  const [id, setId] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const handleContract = async () => {
    const res = await contract.ownerOf(id);
    setOutput(res)
  }

  const handleDownloadSvg = async () => {
    if (id == "")
      return;

    try {
      const url = `${assetsURL}svg/${id}.svg`
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
          'Content-Type': 'application/octet-stream'
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const objectUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = `${id}.svg`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(objectUrl);
        document.body.removeChild(a);
      }
    } catch (error) {

    }
  }

  const handleDownloadPng = async () => {
    if (id == "")
      return;

    try {
      const url = `${assetsURL}png/${id}.png`
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
          'Content-Type': 'application/octet-stream'
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const objectUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = `${id}.png`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(objectUrl);
        document.body.removeChild(a);
      }
    } catch (error) {

    }
  }

  const handlePrev = () => {
    const numId = parseInt(id, 10);
    if (!isNaN(numId) && numId > 0) {
      setId((numId - 1).toString());
    }
  };

  const handleNext = () => {
    const numId = parseInt(id, 10);
    if (!isNaN(numId) && numId < 5079) {
      setId((numId + 1).toString());
    }
  };

  const handleIDInput = (e: any) => {
    const value = e.target.value;
    if (value === '') {
      setId('');
      return;
    }

    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      if (num < 0) {
        setId("0"); // clamp to 0
      } else if (num > 5079) {
        setId("5079"); // clamp to max
      } else {
        setId(num + "");
      }
    }
  }

  useEffect(() => {
    setImageUrl(`${assetsURL}svg/${id}.svg`)
  }, [id])

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900">
      {/* HEADER */}
      <header className="w-full border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src={viteLogo}
              alt="Super Code World"
              className="h-10 w-auto"
            />
            <span className="font-bold text-lg tracking-wide">Super Cool World</span>
          </div>

          {
            isConnected ?
              <nav className="hidden md:flex gap-6 text-gray-600 font-medium">
                {/* <a href="#" className="hover:text-gray-900 transition-colors">Home</a> */}
                <ConnectButton />
              </nav> :
              <></>
          }
        </div>
      </header>

      {/* MAIN */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center space-y-6">
        {
          isConnected ?
            <>
              <div className="flex items-center space-x-4 mb-6">
                {/* Left Arrow */}
                <button
                  className="text-3xl text-gray-700 hover:text-gray-900"
                  onClick={handlePrev}
                >
                  &larr;
                </button>

                {/* Main Card */}
                <div className="relative w-74 h-74 bg-gray-400 rounded-lg overflow-hidden">
                  {
                    id == "" ?
                      <div className="flex items-center justify-center w-full h-full">
                        <span className="text-gray-800 text-lg font-medium">No Super Cool Assets Found</span>
                      </div>
                      :
                      <img
                        src={imageUrl}
                        alt="No Super Cool Assets Found"
                        className="absolute inset-0 object-cover w-full h-full"
                      />
                  }
                </div>

                {/* Right Arrow */}
                <button
                  className="text-3xl text-gray-700 hover:text-gray-900"
                  onClick={handleNext}
                >
                  &rarr;
                </button>
              </div>

              {/* Search Bar */}
              <div className="mt-4">
                <input
                  className="w-74 flex-grow px-4 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ease-in-out"
                  type="number"
                  min={0}
                  max={5079}
                  value={id}
                  onChange={(e) => handleIDInput(e)}
                  placeholder="Search by token ID…"
                />
              </div>

              {/* Download Buttons */}
              <div className="flex space-x-4 mt-4">
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  onClick={handleDownloadSvg}
                >
                  Download SVG
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  onClick={handleDownloadPng}
                >
                  Download PNG
                </button>
              </div>
            </> :
            <div className="max-w-2xl">
              <ConnectButton />
            </div>
        }
      </main>

      {/* FOOTER */}
      <footer className="border-t border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} Super Cool World. All rights reserved.
          </p>

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

export default App
