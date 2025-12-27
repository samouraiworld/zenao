import { queryOptions } from "@tanstack/react-query";
import {
  create as createBatcher,
  windowScheduler,
  keyResolver,
} from "@yornaath/batshit";
import { createPublicClient, http } from "viem";
import { withSpan } from "../tracer";
import { profileABI } from "../evm";
import { zenaoClient } from "../zenao-client";
import { userIdFromPkgPath } from "./user";

export type GnoProfile = {
  address: string;
  displayName: string;
  bio: string;
  avatarUri: string;
};

export type UserProfile = Omit<GnoProfile, "address">;

export const profileOptions = (addr: string | null | undefined) => {
  return queryOptions<UserProfile | null>({
    queryKey: ["profile", addr],
    queryFn: async () => {
      if (!addr) {
        return null;
      }

      const profile = addr.startsWith("0x")
        ? await evmProfiles.fetch(addr as `0x${string}`) // TODO: no type override
        : await profiles.fetch(addr);

      return profile;
    },
  });
};

export const profiles = createBatcher({
  fetcher: async (realmIDs: string[]) => {
    console.log("Batch fetching profiles for realmIDs:", realmIDs);
    if (realmIDs.length === 0) {
      return [];
    }

    const ids = realmIDs.map((realmId) => userIdFromPkgPath(realmId));
    return withSpan(`query:backend:profiles:${ids.join(",")}`, async () => {
      const res = await zenaoClient.getUsersProfile({
        ids,
      });
      console.log("Fetched profiles:", res.profiles);
      return res.profiles;
    });
  },
  // when we call profiles.fetch, this will resolve the correct user using the field `address`
  resolver: keyResolver("address"),
  // this will batch all calls to profiles.fetch that are made within 10 milliseconds.
  scheduler: windowScheduler(10),
});

export const evmProfiles = createBatcher({
  fetcher: async (addrs: `0x${string}`[]) => {
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

      const res: GnoProfile[] = [];
      for (let i = 0; i < addrs.length; i++) {
        res.push({
          address: addrs[i],
          avatarUri: Buffer.from(resu[i][0].substring(2), "hex").toString(),
          displayName: Buffer.from(resu[i][1].substring(2), "hex").toString(),
          bio: Buffer.from(resu[i][2].substring(2), "hex").toString(),
          // bio: resu[i][1] as string,
        });
        console.log("profile", addrs[i], res[i], resu[i]);
      }
      return res;
    });
  },
  // when we call profiles.fetch, this will resolve the correct user using the field `address`
  resolver: keyResolver("address"),
  // this will batch all calls to profiles.fetch that are made within 10 milliseconds.
  scheduler: windowScheduler(50),
});
