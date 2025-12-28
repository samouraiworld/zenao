import {
  InfiniteData,
  infiniteQueryOptions,
  UseInfiniteQueryOptions,
} from "@tanstack/react-query";
import { cacheExchange, createClient, fetchExchange, gql } from "urql";
import z from "zod";
import { withSpan } from "../tracer";
import { DiscoverableFilter } from "@/app/gen/zenao/v1/zenao_pb";

export const DEFAULT_EVENTS_LIMIT = 20;

export const ticketMasterGraphClient = createClient({
  url: "http://localhost:8000/subgraphs/name/subgraph-0/",
  exchanges: [cacheExchange, fetchExchange],
  preferGetMethod: false,
});

export const evmListEventSchema = z.object({
  discoverable: z.boolean(),
  eventAddr: z.string(),
  saleEnd: z.string(),
  creatorAddr: z.string().nullable(),
});

export type EVMListEvent = z.infer<typeof evmListEventSchema>;

const eventsQueryResponseSchema = z.object({
  events: evmListEventSchema.array(),
});

export const eventsList = (
  fromUnixSec: number,
  toUnixSec: number,
  limit: number,
  discoverable: DiscoverableFilter,
  creator: string | undefined,
  options?: Omit<
    UseInfiniteQueryOptions<
      EVMListEvent[],
      Error,
      InfiniteData<EVMListEvent[]>,
      (string | number | undefined)[],
      number // pageParam type
    >,
    | "queryKey"
    | "queryFn"
    | "getNextPageParam"
    | "initialPageParam"
    | "getPreviousPageParam"
  >,
) => {
  const fromInt = Math.floor(fromUnixSec);
  const toInt = Math.floor(toUnixSec);
  const limitInt = Math.floor(limit);

  return infiniteQueryOptions({
    queryKey: ["events", fromInt, toInt, creator, discoverable, limitInt],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      return withSpan(`query:events`, async () => {
        console.log("query event list");

        let start, end, dir;
        if (fromInt < toInt) {
          start = fromInt;
          end = toInt;
          dir = "asc";
        } else {
          start = toInt;
          end = fromInt;
          dir = "desc";
        }

        let discoverableFilter = "";
        switch (discoverable) {
          case DiscoverableFilter.DISCOVERABLE:
            discoverableFilter = "discoverable: true";
            break;
          case DiscoverableFilter.UNDISCOVERABLE:
            discoverableFilter = "discoverable: false";
            break;
        }

        const query = gql`
          {
            events(
              first: ${limitInt.toString()}
              skip: ${(pageParam * limitInt).toString()}
              orderBy: saleEnd
              orderDirection: ${dir}
              where: {
                ${creator ? `creatorAddr: ${JSON.stringify(creator)}` : ""}
                ${discoverableFilter}
                saleEnd_gte: ${JSON.stringify(start.toString())}
                saleEnd_lte: ${JSON.stringify(end.toString())}
              }
            ) {
              eventAddr
              saleEnd
              discoverable
              creatorAddr
            }
          }
        `;

        const result = await ticketMasterGraphClient
          .query(query, {})
          .toPromise();

        console.log("events list", result.data);

        return eventsQueryResponseSchema.parse(result.data).events;
      });
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < limitInt) {
        return undefined;
      }
      return pages.length;
    },
    getPreviousPageParam: (firstPage, pages) => {
      if (firstPage.length < limitInt) {
        return undefined;
      }
      return pages.length - 2;
    },
    ...options,
  });
};

const evmTicketSchema = z.object({
  eventAddr: z.string(),
  ticketPubKey: z.string(),
  owner: z.string(),
});

export type EVMTicket = z.infer<typeof evmTicketSchema>;

export const ticketsByOwner = (
  ownerAddress: string | undefined,
  limit: number,
  eventAddr?: string,
) => {
  const limitInt = Math.floor(limit);

  return infiniteQueryOptions({
    queryKey: ["ticketsByOwner", ownerAddress, limitInt, eventAddr],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      if (!ownerAddress) return [];

      return withSpan(
        `query:chain:user:${ownerAddress}:tickets:${eventAddr}`,
        async () => {
          const eventAddrFilter = eventAddr
            ? `eventAddr: ${JSON.stringify(eventAddr)}`
            : "";

          const query = gql`
          {
            tickets(
              first: ${limitInt.toString()}
              skip: ${(pageParam * limitInt).toString()}
              where: {
                ${eventAddrFilter}
                owner: ${JSON.stringify(ownerAddress)}
              }
            ) {
              eventAddr
              owner
              ticketPubKey
            }
          }
        `;

          const result = await ticketMasterGraphClient
            .query(query, {})
            .toPromise();

          console.log("tickets list", result.data);

          return z
            .object({ tickets: evmTicketSchema.array() })
            .parse(result.data).tickets;
        },
      );
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < limitInt) {
        return undefined;
      }
      return pages.length;
    },
    getPreviousPageParam: (firstPage, pages) => {
      if (firstPage.length < limitInt) {
        return undefined;
      }
      return pages.length - 2;
    },
    enabled: !!ownerAddress,
  });
};
