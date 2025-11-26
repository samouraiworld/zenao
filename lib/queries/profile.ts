import { GnoJSONRPCProvider } from "@gnolang/gno-js-client";
import { queryOptions } from "@tanstack/react-query";
import {
  create as createBatcher,
  windowScheduler,
  keyResolver,
} from "@yornaath/batshit";
import { MessageInitShape } from "@bufbuild/protobuf";
import { addressFromRealmId, extractGnoJSONResponse } from "../gno";
import { withSpan } from "../tracer";
import { BatchProfileRequestSchema } from "@/app/gen/zenao/v1/zenao_pb";

export type GnoProfile = {
  address: string;
  displayName: string;
  bio: string;
  avatarUri: string;
};

export type UserProfile = Omit<GnoProfile, "address">;

export const profileOptions = (realmId: string | null | undefined) => {
  const addr = addressFromRealmId(realmId);
  return queryOptions<UserProfile | null>({
    queryKey: ["profile", addr],
    queryFn: async () => {
      if (!addr || !process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT) {
        return null;
      }

      const profile = await profiles.fetch(addr);

      return profile;
    },
  });
};
export const profiles = createBatcher({
  fetcher: async (addrs: string[]) => {
    if (!process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || addrs.length === 0) {
      return [];
    }

    return withSpan(`query:chain:profiles:${addrs.join(",")}`, async () => {
      const client = new GnoJSONRPCProvider(
        process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT!,
      );

      const req: MessageInitShape<typeof BatchProfileRequestSchema> = {
        fields: [
          { key: "DisplayName", type: "string" },
          { key: "Bio", type: "string" },
          { key: "Avatar", type: "string" },
        ],
        addresses: addrs,
      };
      const resRaw = await client.evaluateExpression(
        `gno.land/r/zenao/batchprofile`,
        `queryJSON(${JSON.stringify(JSON.stringify(req))})`,
      );
      const resu = extractGnoJSONResponse(resRaw) as unknown[][];
      const res: GnoProfile[] = [];
      for (let i = 0; i < addrs.length; i++) {
        res.push({
          address: addrs[i],
          displayName: resu[i][0] as string,
          bio: resu[i][1] as string,
          avatarUri: resu[i][2] as string,
        });
      }
      return res;
    });
  },
  // when we call profiles.fetch, this will resolve the correct user using the field `address`
  resolver: keyResolver("address"),
  // this will batch all calls to profiles.fetch that are made within 10 milliseconds.
  scheduler: windowScheduler(10),
});
