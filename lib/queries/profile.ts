import { queryOptions } from "@tanstack/react-query";
import {
  create as createBatcher,
  windowScheduler,
  keyResolver,
} from "@yornaath/batshit";
import { createPublicClient, http } from "viem";
import { withSpan } from "../tracer";
import { zenaoClient } from "../zenao-client";
import { profileABI } from "../evm";
import { getWalletForUserId } from "../web3-mapping";

export type GnoProfile = {
  userId: string;
  displayName: string;
  bio: string;
  avatarUri: string;
  isTeam: boolean;
};

export type UserProfile = Omit<GnoProfile, "userId">;

export const profileOptions = (userId: string | null | undefined) => {
  return queryOptions<UserProfile | null>({
    queryKey: ["profile", userId],
    queryFn: async () => {
      if (!userId) {
        return null;
      }

      // Try to fetch from backend first (default)
      const profile = await profiles.fetch(userId);

      // If backend has no profile, try to fetch from EVM
      // TODO: Enable when EVM_RPC and contracts are deployed
      if (!profile || !profile.displayName) {
        const wallet = await getWalletForUserId(userId);
        if (wallet) {
          const evmProfile = await evmProfiles.fetch(wallet);
          if (evmProfile) {
            return evmProfile;
          }
        }
      }

      return profile;
    },
  });
};

export const profiles = createBatcher({
  fetcher: async (userIds: string[]) => {
    if (userIds.length === 0) {
      return [];
    }

    return withSpan(`query:backend:profiles:${userIds.join(",")}`, async () => {
      const res = await zenaoClient.getUsersProfile({
        ids: userIds,
      });
      return res.profiles;
    });
  },
  // when we call profiles.fetch, this will resolve the correct user using the field `userId`
  resolver: keyResolver("userId"),
  // this will batch all calls to profiles.fetch that are made within 10 milliseconds.
  scheduler: windowScheduler(10),
});

export const evmProfiles = createBatcher({
  fetcher: async (addrs: `0x${string}`[]) => {
    // TODO: Configure NEXT_PUBLIC_EVM_RPC in .env
    // TODO: Deploy Profile smart contract and set NEXT_PUBLIC_EVM_PROFILE_CONTRACT_ADDRESS
    if (!process.env.NEXT_PUBLIC_EVM_RPC || addrs.length === 0) {
      return [];
    }

    return withSpan(`query:chain:profiles:${addrs.join(",")}`, async () => {
      const client = createPublicClient({
        transport: http(process.env.NEXT_PUBLIC_EVM_RPC),
      });

      const resu = await client.readContract({
        abi: profileABI,
        address: process.env
          .NEXT_PUBLIC_EVM_PROFILE_CONTRACT_ADDRESS as `0x${string}`,
        functionName: "getBatch",
        args: [addrs, ["pfp", "dn", "bio"]],
      });

      // Convert hex bytes to strings and map to internal format
      const res: UserProfile[] = [];
      for (let i = 0; i < addrs.length; i++) {
        res.push({
          avatarUri: Buffer.from(resu[i][0].substring(2), "hex").toString(),
          displayName: Buffer.from(resu[i][1].substring(2), "hex").toString(),
          bio: Buffer.from(resu[i][2].substring(2), "hex").toString(),
          isTeam: false, // TODO: Add isTeam to smart contract
        });
        console.log("profile", addrs[i], res[i], resu[i]);
      }
      return res;
    });
  },
  // We can't use keyResolver here because UserProfile doesn't have userId/address
  // Instead, we return profiles in the same order as the input addresses
  resolver: (profiles: UserProfile[], _address: `0x${string}`) => {
    // This is a fallback - batching will work by maintaining order
    return profiles[0] || null;
  },
  // this will batch all calls to profiles.fetch that are made within 50 milliseconds.
  scheduler: windowScheduler(50),
});
