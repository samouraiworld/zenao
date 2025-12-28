"use client";

import {
  AUTH_CONNECTION,
  IWeb3AuthState,
  WALLET_CONNECTORS,
  WEB3AUTH_NETWORK,
} from "@web3auth/modal";
import {
  useWeb3Auth,
  useWeb3AuthConnect,
  useWeb3AuthDisconnect,
  Web3AuthContextConfig,
  Web3AuthProvider,
} from "@web3auth/modal/react";
import { WagmiProvider } from "@web3auth/modal/react/wagmi";
import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import QueryProviders from "@/components/providers/query-providers";

// IMP END - Setup Web3Auth Provider
// IMP START - Setup Wagmi Provider

const clientId =
  "BBOLXJ8S6Zmd41TuJtFL4Cq4E2ehPGbLmtIy3nyeApSJGMoHp2dHW2fIDo4EIUs9-Q6Va4ri1LKnV00fyGZPd2o"; // get from https://dashboard.web3auth.io
// IMP END - Dashboard Registration

// IMP START - Config
const web3AuthContextConfig: Web3AuthContextConfig = {
  web3AuthOptions: {
    clientId,
    web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
    // IMP START - SSR
    ssr: true,
    accountAbstractionConfig: {
      smartAccountType: "safe",
      chains: [
        {
          chainId: "0xaa37dc",
          bundlerConfig: {
            url: "https://api.web3auth.io/infura-service/v1/0xaa37dc/BBOLXJ8S6Zmd41TuJtFL4Cq4E2ehPGbLmtIy3nyeApSJGMoHp2dHW2fIDo4EIUs9-Q6Va4ri1LKnV00fyGZPd2o",
          },
        },
        {
          chainId: "0x14a34",
          bundlerConfig: {
            url: "https://api.web3auth.io/infura-service/v1/0x14a34/BBOLXJ8S6Zmd41TuJtFL4Cq4E2ehPGbLmtIy3nyeApSJGMoHp2dHW2fIDo4EIUs9-Q6Va4ri1LKnV00fyGZPd2o",
          },
        },
      ],
    },
    // IMP END - SSR
  },
};

export function AppWeb3AuthProvider({
  children,
  initialState,
}: {
  children: React.ReactNode;
  initialState: IWeb3AuthState;
}) {
  return (
    <Web3AuthProvider
      config={web3AuthContextConfig}
      initialState={initialState}
    >
      <QueryProviders>
        <WagmiProvider>
          <Connector />
          {children}
        </WagmiProvider>
      </QueryProviders>
    </Web3AuthProvider>
  );
}

function Connector() {
  const { status, isInitialized } = useWeb3Auth();
  const { connectTo } = useWeb3AuthConnect();
  const { disconnect } = useWeb3AuthDisconnect();
  const { isSignedIn, getToken, isLoaded: clerkLoaded } = useAuth();

  useEffect(() => {
    if (!isInitialized || !clerkLoaded || !isSignedIn || status !== "ready") {
      return;
    }
    const connect = async () => {
      console.log("connecting");
      const token = await getToken();
      if (!token) {
        return;
      }
      await connectTo(WALLET_CONNECTORS.AUTH, {
        authConnection: AUTH_CONNECTION.CUSTOM,
        authConnectionId: "clerk-zenao-dev",
        idToken: token,
      });
    };
    connect();
  }, [isInitialized, connectTo, isSignedIn, getToken, status, clerkLoaded]);

  useEffect(() => {
    if (
      !isInitialized ||
      !clerkLoaded ||
      isSignedIn ||
      status !== "connected"
    ) {
      return;
    }
    const dc = async () => {
      console.log("disconnecting");
      await disconnect();
    };
    dc();
  }, [isInitialized, clerkLoaded, disconnect, status, isSignedIn]);
  return null;
}
