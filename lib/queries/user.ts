import { GnoJSONRPCProvider } from "@gnolang/gno-js-client";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { extractGnoStringResponse } from "../gno";
import { zenaoClient } from "@/app/zenao-client";
import { urlPattern } from "@/components/form/types";

const userSchema = z.object({
  displayName: z.string().trim().min(1),
  bio: z.string().min(1).max(400),
  avatarUri: z.string().min(1).max(400).regex(urlPattern, "URL is not valid"),
  address: z.string().trim().min(1),
});
export type UserSchemaType = z.infer<typeof userSchema>;

export const userOptions = (authToken: string | null) =>
  queryOptions({
    queryKey: ["user", authToken],
    queryFn: async () => {
      if (!authToken) {
        return null;
      }
      if (!process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT) {
        return null;
      }
      const { address } = await zenaoClient.getUserAddress(
        {},
        { headers: { Authorization: "Bearer " + authToken } },
      );
      const client = new GnoJSONRPCProvider(
        process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT,
      );
      const resUsername = await client.evaluateExpression(
        `gno.land/r/demo/profile`,
        `GetStringField(${JSON.stringify(address)}, DisplayName, "")`,
      );
      const resBio = await client.evaluateExpression(
        `gno.land/r/demo/profile`,
        `GetStringField(${JSON.stringify(address)}, Bio, "")`,
      );
      const resAvatarURI = await client.evaluateExpression(
        `gno.land/r/demo/profile`,
        `GetStringField(${JSON.stringify(address)}, Avatar, "")`,
      );

      const user = {
        displayName: extractGnoStringResponse(resUsername),
        bio: extractGnoStringResponse(resBio),
        avatarUri: extractGnoStringResponse(resAvatarURI),
        address: address,
      };

      return userSchema.parse(user);
    },
  });
