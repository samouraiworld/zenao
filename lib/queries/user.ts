import { GnoJSONRPCProvider } from "@gnolang/gno-js-client";
import { queryOptions } from "@tanstack/react-query";
import { extractGnoStringResponse } from "../gno";
import { zenaoClient } from "@/app/zenao-client";

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

      return {
        displayName: extractGnoStringResponse(resUsername),
        bio: extractGnoStringResponse(resBio),
        avatarUri: extractGnoStringResponse(resAvatarURI),
        address: address,
      };
    },
  });

export const userFromAddress = (address: string) =>
  queryOptions({
    queryKey: ["userFromAddress", address],
    queryFn: async () => {
      if (!process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT) {
        return null;
      }
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

      return {
        displayName: extractGnoStringResponse(resUsername),
        bio: extractGnoStringResponse(resBio),
        avatarUri: extractGnoStringResponse(resAvatarURI),
      };
    },
  });
