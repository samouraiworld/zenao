import { fromJson } from "@bufbuild/protobuf";
import { GnoJSONRPCProvider } from "@gnolang/gno-js-client";
import { queryOptions, UseQueryOptions } from "@tanstack/react-query";
import { extractGnoJSONResponse } from "@/lib/gno";
import {
  EventInfo,
  EventInfoJson,
  EventInfoSchema,
} from "@/app/gen/zenao/v1/zenao_pb";

export const eventsList = (
  fromUnixSec: number,
  toUnixSec: number,
  limit: number,
  options?: Omit<
    UseQueryOptions<EventInfo[], Error, EventInfo[], (string | number)[]>,
    "queryKey" | "queryFn"
  >,
) => {
  const fromInt = Math.floor(fromUnixSec);
  const toInt = Math.floor(toUnixSec);
  const limitInt = Math.floor(limit);
  return queryOptions({
    queryKey: ["events", fromInt, toInt, limitInt],
    queryFn: async () => {
      const client = new GnoJSONRPCProvider(
        process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || "",
      );
      const res = await client.evaluateExpression(
        `gno.land/r/zenao/eventreg`,
        `eventsToJSON(listEvents(${fromInt}, ${toInt}, ${limitInt}))`,
      );
      const raw = extractGnoJSONResponse(res);
      return eventListFromJson(raw);
    },
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
  return queryOptions({
    queryKey: ["eventsByOrganizer", organizer, fromInt, toInt, limitInt],
    queryFn: async () => {
      const client = new GnoJSONRPCProvider(
        process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || "",
      );
      const res = await client.evaluateExpression(
        `gno.land/r/zenao/eventreg`,
        `eventsToJSON(listEventsByOrganizer(${JSON.stringify(organizer)}, ${fromInt}, ${toInt}, ${limitInt}))`,
      );
      const raw = extractGnoJSONResponse(res);
      return eventListFromJson(raw);
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
  return queryOptions({
    queryKey: ["eventsByParticipant", participant, fromInt, toInt, limitInt],
    queryFn: async () => {
      const client = new GnoJSONRPCProvider(
        process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || "",
      );
      const res = await client.evaluateExpression(
        `gno.land/r/zenao/eventreg`,
        `eventsToJSON(listEventsByParticipant(${JSON.stringify(participant)}, ${fromInt}, ${toInt}, ${limitInt}))`,
      );
      const raw = extractGnoJSONResponse(res);
      return eventListFromJson(raw);
    },
  });
};

function eventListFromJson(raw: unknown) {
  const list = raw as unknown[];
  return list.map((elem) => fromJson(EventInfoSchema, elem as EventInfoJson));
}
