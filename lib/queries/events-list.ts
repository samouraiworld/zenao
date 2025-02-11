import { queryOptions } from "@tanstack/react-query";
import { GnoJSONRPCProvider } from "@gnolang/gno-js-client";
import { z } from "zod";
import { eventInfoSchema, extractGnoJSONResponse } from "@/lib/gno";

const eventsListSchema = z.array(
  eventInfoSchema.extend({ pkgPath: z.string() }),
);
export type EventsListSchemaType = z.infer<typeof eventsListSchema>;

export const eventsList = (
  fromUnixSec: number,
  toUnixSec: number,
  limit: number,
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
      return eventsListSchema.parse(raw);
    },
  });
};

export const eventsByCreatorList = (
  creator: string,
  fromUnixSec: number,
  toUnixSec: number,
  limit: number,
) => {
  const fromInt = Math.floor(fromUnixSec);
  const toInt = Math.floor(toUnixSec);
  const limitInt = Math.floor(limit);
  return queryOptions({
    queryKey: ["eventsByCreator", creator, fromInt, toInt, limitInt],
    queryFn: async () => {
      const client = new GnoJSONRPCProvider(
        process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || "",
      );
      const res = await client.evaluateExpression(
        `gno.land/r/zenao/eventreg`,
        `eventsToJSON(listEventsByCreator(${JSON.stringify(creator)}, ${fromInt}, ${toInt}, ${limitInt}))`,
      );
      const raw = extractGnoJSONResponse(res);
      return eventsListSchema.parse(raw);
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
      return eventsListSchema.parse(raw);
    },
  });
};
