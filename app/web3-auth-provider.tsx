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
import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useAccount } from "wagmi";
import QueryProviders from "@/components/providers/query-providers";
import { getUserIdForWallet } from "@/lib/web3-mapping";

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
    // ssr: true,
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
  const { user } = useUser();
  const { address, isConnected } = useAccount();
  const [walletError, setWalletError] = useState<string | null>(null);

  // Connect wallet when user is signed in to Clerk
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

  // Disconnect wallet when user signs out of Clerk
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

  // Verify wallet is linked to userId when connected
  useEffect(() => {
    if (!isConnected || !address || !user?.id) {
      setWalletError(null);
      return;
    }

    const verifyWalletLink = async () => {
      // TODO: Enable when NEXT_PUBLIC_EVM_USER_REGISTRY_ADDRESS is configured
      if (!process.env.NEXT_PUBLIC_EVM_USER_REGISTRY_ADDRESS) {
        console.warn(
          "EVM User Registry not configured - skipping wallet verification",
        );
        return;
      }

      try {
        const linkedUserId = await getUserIdForWallet(address);

        if (!linkedUserId) {
          setWalletError(
            "This wallet is not linked to any account. Please link your wallet first.",
          );
          console.error("Wallet not linked:", address);
          return;
        }

        if (linkedUserId !== user.id) {
          setWalletError(
            `This wallet is linked to a different account. Expected userId: ${user.id}, but wallet is linked to: ${linkedUserId}`,
          );
          console.error("Wallet/userId mismatch:", {
            walletAddress: address,
            expectedUserId: user.id,
            linkedUserId,
          });
          // TODO: Optionally disconnect the wallet here
          // await disconnect();
          return;
        }

        // Success - wallet is correctly linked
        setWalletError(null);
        console.log("Wallet verified for userId:", user.id);
      } catch (error) {
        console.error("Error verifying wallet:", error);
        setWalletError("Failed to verify wallet ownership");
      }
    };

    verifyWalletLink();
  }, [isConnected, address, user?.id]);

  // Display error if wallet verification fails
  if (walletError) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: "#ff4444",
          color: "white",
          padding: "12px",
          textAlign: "center",
          zIndex: 9999,
        }}
      >
        <strong>Wallet Error:</strong> {walletError}
      </div>
    );
  }

  return null;
}
