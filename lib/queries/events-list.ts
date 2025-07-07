import { fromJson } from "@bufbuild/protobuf";
import { GnoJSONRPCProvider } from "@gnolang/gno-js-client";
import {
  InfiniteData,
  infiniteQueryOptions,
  UseInfiniteQueryOptions,
} from "@tanstack/react-query";
import { extractGnoJSONResponse } from "@/lib/gno";
import {
  EventInfo,
  EventInfoJson,
  EventInfoSchema,
} from "@/app/gen/zenao/v1/zenao_pb";

export const DEFAULT_EVENTS_LIMIT = 2;

export const eventsList = (
  fromUnixSec: number,
  toUnixSec: number,
  limit: number,
  options?: Omit<
    UseInfiniteQueryOptions<
      EventInfo[],
      Error,
      InfiniteData<EventInfo[]>,
      (string | number)[]
    >,
    "queryKey" | "queryFn"
  >,
) => {
  const fromInt = Math.floor(fromUnixSec);
  const toInt = Math.floor(toUnixSec);
  const limitInt = Math.floor(limit);

  // TODO Use of key-based pagination skipping fetched events

  return infiniteQueryOptions({
    queryKey: ["events", fromInt, toInt, limitInt],
    initialPageParam: fromInt,
    queryFn: async ({ pageParam = 0 }) => {
      const client = new GnoJSONRPCProvider(
        process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || "",
      );
      const res = await client.evaluateExpression(
        `gno.land/r/zenao/eventreg`,
        `eventsToJSON(listEvents(${pageParam}, ${toInt}, ${limitInt}))`,
      );
      const raw = extractGnoJSONResponse(res);
      const json = eventListFromJson(raw);

      return json;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.length < limitInt) {
        return undefined;
      }
      return Number(lastPage[lastPage.length - 1].startDate);
    },
    getPreviousPageParam: (firstPage) => {
      if (firstPage.length < limitInt) {
        return undefined;
      }
      return Number(firstPage[0].startDate);
    },
    staleTime: 60000, // 1 minute
    ...options,
  });
};

export const eventsByOrganizerList = (
  organizer: string,
  fromUnixSec: number,
  toUnixSec: number,
  limit: number,
) => {
  const fromInt = Math.floor(fromUnixSec);
  const toInt = Math.floor(toUnixSec);
  const limitInt = Math.floor(limit);

  return infiniteQueryOptions({
    queryKey: ["eventsByOrganizer", organizer, fromInt, toInt, limitInt],
    initialPageParam: fromInt,
    queryFn: async ({ pageParam }) => {
      const client = new GnoJSONRPCProvider(
        process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || "",
      );
      const res = await client.evaluateExpression(
        `gno.land/r/zenao/eventreg`,
        `eventsToJSON(listEventsByOrganizer(${JSON.stringify(organizer)}, ${pageParam}, ${toInt}, ${limitInt}))`,
      );
      const raw = extractGnoJSONResponse(res);
      return eventListFromJson(raw);
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.length < limitInt) {
        return undefined;
      }
      return Number(lastPage[lastPage.length - 1].startDate);
    },
    getPreviousPageParam: (fistPage) => {
      if (fistPage.length < limitInt) {
        return undefined;
      }
      return Number(fistPage[0].startDate);
    },
  });
};

export const eventsByParticipantList = (
  participant: string,
  fromUnixSec: number,
  toUnixSec: number,
  limit: number,
) => {
  const fromInt = Math.floor(fromUnixSec);
  const toInt = Math.floor(toUnixSec);
  const limitInt = Math.floor(limit);

  return infiniteQueryOptions({
    queryKey: ["eventsByParticipant", participant, fromInt, toInt, limitInt],
    initialPageParam: fromInt,
    queryFn: async ({ pageParam }) => {
      const client = new GnoJSONRPCProvider(
        process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || "",
      );
      const res = await client.evaluateExpression(
        `gno.land/r/zenao/eventreg`,
        `eventsToJSON(listEventsByParticipant(${JSON.stringify(participant)}, ${pageParam}, ${toInt}, ${limitInt}))`,
      );
      const raw = extractGnoJSONResponse(res);
      return eventListFromJson(raw);
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.length < limitInt) {
        return undefined;
      }
      return Number(lastPage[lastPage.length - 1].startDate);
    },
    getPreviousPageParam: (fistPage) => {
      if (fistPage.length < limitInt) {
        return undefined;
      }
      return Number(fistPage[0].startDate) + 1;
    },
  });
};

function eventListFromJson(raw: unknown) {
  const list = raw as unknown[];
  return list.map((elem) => fromJson(EventInfoSchema, elem as EventInfoJson));
}
