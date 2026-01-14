/**
 * Mapping between Clerk userId and EVM wallet addresses
 *
 * TODO: This should be stored on-chain in a registry smart contract
 * For now, this is a client-side utility to manage the relationship
 */

import { createPublicClient, http } from "viem";

// TODO: Create and deploy a UserRegistry smart contract with this ABI
export const userRegistryABI = [
  {
    type: "function",
    name: "linkWallet",
    inputs: [
      {
        name: "userId",
        type: "string",
        internalType: "string",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getWallet",
    inputs: [
      {
        name: "userId",
        type: "string",
        internalType: "string",
      },
    ],
    outputs: [
      {
        name: "wallet",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getUserId",
    inputs: [
      {
        name: "wallet",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "userId",
        type: "string",
        internalType: "string",
      },
    ],
    stateMutability: "view",
  },
] as const;

/**
 * Get the wallet address linked to a userId
 * @param userId - The Clerk user ID
 * @returns The linked wallet address or null if not linked
 */
export async function getWalletForUserId(
  userId: string,
): Promise<`0x${string}` | null> {
  // TODO: Replace with actual on-chain call once UserRegistry is deployed
  if (!process.env.NEXT_PUBLIC_EVM_RPC) {
    console.warn("NEXT_PUBLIC_EVM_RPC not configured");
    return null;
  }

  if (!process.env.NEXT_PUBLIC_EVM_USER_REGISTRY_ADDRESS) {
    console.warn("NEXT_PUBLIC_EVM_USER_REGISTRY_ADDRESS not configured");
    return null;
  }

  try {
    const client = createPublicClient({
      transport: http(process.env.NEXT_PUBLIC_EVM_RPC),
    });

    const wallet = await client.readContract({
      abi: userRegistryABI,
      address: process.env
        .NEXT_PUBLIC_EVM_USER_REGISTRY_ADDRESS as `0x${string}`,
      functionName: "getWallet",
      args: [userId],
    });

    return wallet === "0x0000000000000000000000000000000000000000"
      ? null
      : wallet;
  } catch (error) {
    console.error("Error fetching wallet for userId:", error);
    return null;
  }
}

/**
 * Get the userId linked to a wallet address
 * @param wallet - The EVM wallet address
 * @returns The linked userId or null if not linked
 */
export async function getUserIdForWallet(
  wallet: `0x${string}`,
): Promise<string | null> {
  // TODO: Replace with actual on-chain call once UserRegistry is deployed
  if (!process.env.NEXT_PUBLIC_EVM_RPC) {
    console.warn("NEXT_PUBLIC_EVM_RPC not configured");
    return null;
  }

  if (!process.env.NEXT_PUBLIC_EVM_USER_REGISTRY_ADDRESS) {
    console.warn("NEXT_PUBLIC_EVM_USER_REGISTRY_ADDRESS not configured");
    return null;
  }

  try {
    const client = createPublicClient({
      transport: http(process.env.NEXT_PUBLIC_EVM_RPC),
    });

    const userId = await client.readContract({
      abi: userRegistryABI,
      address: process.env
        .NEXT_PUBLIC_EVM_USER_REGISTRY_ADDRESS as `0x${string}`,
      functionName: "getUserId",
      args: [wallet],
    });

    return userId || null;
  } catch (error) {
    console.error("Error fetching userId for wallet:", error);
    return null;
  }
}

/**
 * Check if a wallet is linked to a specific userId
 * @param wallet - The EVM wallet address
 * @param expectedUserId - The expected userId
 * @returns true if the wallet is linked to the userId, false otherwise
 */
export async function isWalletLinkedToUserId(
  wallet: `0x${string}`,
  expectedUserId: string,
): Promise<boolean> {
  const linkedUserId = await getUserIdForWallet(wallet);
  return linkedUserId === expectedUserId;
}
