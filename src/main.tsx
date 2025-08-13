import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import "@rainbow-me/rainbowkit/styles.css";
import {
  getDefaultConfig,
  RainbowKitProvider,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider, http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mainnet } from "wagmi/chains";

const config = getDefaultConfig({
  appName: "SuperCoolWorldApp",
  projectId: "72b49caafbcd69287c043b188c2fadbd",
  chains: [mainnet],
  ssr: false,
  transports: {
    [mainnet.id]: http(`https://eth-mainnet.g.alchemy.com/v2/X8bpUEtm8aadwG_h7pYDu`),
  }
});

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <WagmiProvider config={config}>
    <QueryClientProvider client={queryClient}>
      <RainbowKitProvider>
        <App />
      </RainbowKitProvider>
    </QueryClientProvider>
  </WagmiProvider>
)
