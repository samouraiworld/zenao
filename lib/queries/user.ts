import { GnoJSONRPCProvider } from "@gnolang/gno-js-client";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { zenaoClient } from "@/app/zenao-client";

const userInfosSchema = z.object({
  displayName: z.string().trim(),
  bio: z.string().trim().min(1),
  avatarUri: z.string().trim().min(1),
});
type UserInfoSchemaType = z.infer<typeof userInfosSchema>;

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
        process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || "",
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
      console.log("RES", resUsername, resBio, resAvatarURI);

      const user: UserInfoSchemaType = {
        displayName: resUsername.split(`"`)[1],
        bio: resBio.split(`"`)[1],
        avatarUri: resAvatarURI.split(`"`)[1],
      };

      return userInfosSchema.parse(user);
    },
  });
