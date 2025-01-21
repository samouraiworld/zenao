import { queryOptions } from "@tanstack/react-query";
import { zenaoClient } from "@/app/zenao-client";

export const businessAccountsOptions = (authToken: string | undefined) =>
  queryOptions({
    queryKey: ["businessAccounts", authToken],
    queryFn: async () => {
      if (!authToken) {
        return [];
      }
      const res = await zenaoClient.listBusinessAccounts(
        {},
        { headers: { Authorization: "Bearer " + authToken } },
      );
      return res.accounts;
    },
  });
