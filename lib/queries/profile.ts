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

      // XXX: BEFORE UPDATING WITH MAIN
      // const profile = addr.startsWith("0x")
      //   ? await evmProfiles.fetch(addr as `0x${string}`) // TODO: no type override
      //   : await profiles.fetch(addr);

      const profile = await profiles.fetch(userId);

      return profile;
    },
  });
};

export const profiles = createBatcher({
  fetcher: async (userIds: string[]) => {
    // XXX: BEFORE UPDATING WITH MAIN
    // if (!process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || addrs.length === 0) {

    if (userIds.length === 0) {
      return [];
    }

    // XXX: BEFORE UPDATING WITH MAIN
    // return withSpan(`query:chain:profiles:${addrs.join(",")}`, async () => {
    //   const client = new GnoJSONRPCProvider(
    //     process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT!,
    //   );

    //   const req: MessageInitShape<typeof BatchProfileRequestSchema> = {
    //     fields: [
    //       { key: "DisplayName", type: "string" },
    //       { key: "Bio", type: "string" },
    //       { key: "Avatar", type: "string" },
    //     ],
    //     addresses: addrs,
    //   };
    //   const resRaw = await client.evaluateExpression(
    //     `gno.land/r/zenao/batchprofile`,
    //     `queryJSON(${JSON.stringify(JSON.stringify(req))})`,
    //   );
    //   const resu = extractGnoJSONResponse(resRaw) as unknown[][];
    //   const res: GnoProfile[] = [];
    //   for (let i = 0; i < addrs.length; i++) {
    //     res.push({
    //       address: addrs[i],
    //       displayName: resu[i][0] as string,
    //       bio: resu[i][1] as string,
    //       avatarUri: resu[i][2] as string,
    //     });
    //   }
    //   return res;
    // });

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
          // XXX: BEFORE UPDATING WITH MAIN
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

  // XXX: BEFORE UPDATING WITH MAIN
  resolver: keyResolver("address"),

  // this will batch all calls to profiles.fetch that are made within 10 milliseconds.
  scheduler: windowScheduler(50),
});
