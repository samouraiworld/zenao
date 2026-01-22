import { queryOptions } from "@tanstack/react-query";
import { withSpan } from "../tracer";
import { buildQueryHeaders } from "./build-query-headers";
import { zenaoClient } from "@/lib/zenao-client";
import { GetToken } from "@/lib/utils";

export const orderDetails = (
  orderId: string,
  getToken: GetToken,
  teamId?: string,
) =>
  queryOptions({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const token = await getToken();

      return withSpan(`query:backend:order:${orderId}`, async () => {
        if (!token) {
          throw new Error("User not logged in");
        }

        const data = await zenaoClient.getOrderDetails(
          { orderId },
          { headers: buildQueryHeaders(token, teamId) },
        );

        return data;
      });
    },
  });
