import { fromJson } from "@bufbuild/protobuf";
import { GnoJSONRPCProvider } from "@gnolang/gno-js-client";
import {
  InfiniteData,
  infiniteQueryOptions,
  UseInfiniteQueryOptions,
} from "@tanstack/react-query";
import { withSpan } from "../tracer";
import { extractGnoJSONResponse } from "@/lib/gno";
import {
  EventInfo,
  EventInfoJson,
  EventInfoSchema,
  DiscoverableFilter,
} from "@/app/gen/zenao/v1/zenao_pb";

export const DEFAULT_EVENTS_LIMIT = 20;

export const eventsList = (
  fromUnixSec: number,
  toUnixSec: number,
  limit: number,
  options?: Omit<
    UseInfiniteQueryOptions<
      EventInfo[],
      Error,
      InfiniteData<EventInfo[]>,
      (string | number)[],
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
    queryKey: ["events", fromInt, toInt, limitInt],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      return withSpan(`query:events`, async () => {
        const client = new GnoJSONRPCProvider(
          process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || "",
        );
        const res = await client.evaluateExpression(
          `gno.land/r/zenao/eventreg`,
          `eventsToJSON(listEvents(${fromInt}, ${toInt}, ${limitInt}, ${
            pageParam * limitInt
          }))`,
        );
        const raw = extractGnoJSONResponse(res);
        const json = eventListFromJson(raw);

        return json;
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

export const eventsByOrganizerList = (
  organizer: string,
  discoverableFilter: DiscoverableFilter,
  fromUnixSec: number,
  toUnixSec: number,
  limit: number,
) => {
  const fromInt = Math.floor(fromUnixSec);
  const toInt = Math.floor(toUnixSec);
  const limitInt = Math.floor(limit);

  return infiniteQueryOptions({
    queryKey: [
      "eventsByOrganizer",
      organizer,
      discoverableFilter,
      fromInt,
      toInt,
      limitInt,
    ],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      return withSpan(
        `query:chain:user:${organizer}:events:role:organizer`,
        async () => {
          const client = new GnoJSONRPCProvider(
            process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || "",
          );
          const res = await client.evaluateExpression(
            `gno.land/r/zenao/eventreg`,
            `eventsToJSON(listEventsByOrganizer(${JSON.stringify(organizer)}, ${discoverableFilter}, ${fromInt}, ${toInt}, ${limitInt}, ${pageParam * limitInt}))`,
          );
          const raw = extractGnoJSONResponse(res);
          return eventListFromJson(raw);
        },
      );
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < limitInt) {
        return undefined;
      }
      return pages.length;
    },
    getPreviousPageParam: (fistPage, pages) => {
      if (fistPage.length < limitInt) {
        return undefined;
      }
      return pages.length - 2;
    },
  });
};

export const eventsByParticipantList = (
  participant: string,
  discoverableFilter: DiscoverableFilter,
  fromUnixSec: number,
  toUnixSec: number,
  limit: number,
) => {
  const fromInt = Math.floor(fromUnixSec);
  const toInt = Math.floor(toUnixSec);
  const limitInt = Math.floor(limit);

  return infiniteQueryOptions({
    queryKey: [
      "eventsByParticipant",
      participant,
      discoverableFilter,
      fromInt,
      toInt,
      limitInt,
    ],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      return withSpan(
        `query:chain:user:${participant}:events:role:participant`,
        async () => {
          const client = new GnoJSONRPCProvider(
            process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || "",
          );
          const res = await client.evaluateExpression(
            `gno.land/r/zenao/eventreg`,
            `eventsToJSON(listEventsByParticipant(${JSON.stringify(participant)}, ${discoverableFilter}, ${fromInt}, ${toInt}, ${limitInt}, ${pageParam * limitInt}))`,
          );
          const raw = extractGnoJSONResponse(res);
          return eventListFromJson(raw);
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
  });
};

function eventListFromJson(raw: unknown) {
  const list = raw as unknown[];
  return list.map((elem) => fromJson(EventInfoSchema, elem as EventInfoJson));
}
