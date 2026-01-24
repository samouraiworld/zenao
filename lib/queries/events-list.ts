import {
  InfiniteData,
  infiniteQueryOptions,
  queryOptions,
  UseInfiniteQueryOptions,
} from "@tanstack/react-query";
import z from "zod";
import { withSpan } from "../tracer";
import { zenaoClient } from "../zenao-client";
import { buildQueryHeaders } from "./build-query-headers";
import { EventUserRole } from "./event-users";
import { DiscoverableFilter, LocationFilter } from "@/app/gen/zenao/v1/zenao_pb";
import { GetToken } from "@/lib/utils";
import {
  eventInfoSchema,
  eventUserSchema,
  SafeEventInfo,
} from "@/types/schemas";

export const DEFAULT_EVENTS_LIMIT = 20;

export type LocationFilterParams = {
  lat: number;
  lng: number;
  radiusKm: number;
};

export const eventsList = (
  fromUnixSec: number,
  toUnixSec: number,
  limit: number,
  options?: Omit<
    UseInfiniteQueryOptions<
      SafeEventInfo[],
      Error,
      InfiniteData<SafeEventInfo[]>,
      (string | number | LocationFilterParams | undefined)[],
      number // pageParam type
    >,
    | "queryKey"
    | "queryFn"
    | "getNextPageParam"
    | "initialPageParam"
    | "getPreviousPageParam"
  >,
  locationFilter?: LocationFilterParams,
) => {
  const fromInt = Math.floor(fromUnixSec);
  const toInt = Math.floor(toUnixSec);
  const limitInt = Math.floor(limit);

  return infiniteQueryOptions({
    queryKey: ["events", fromInt, toInt, limitInt, locationFilter],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      return withSpan(`query:backend:events`, async () => {
        const res = await zenaoClient.listEvents({
          limit: limitInt,
          offset: pageParam * limitInt,
          from: BigInt(fromInt),
          to: BigInt(toInt),
          discoverableFilter: DiscoverableFilter.DISCOVERABLE,
          locationFilter: locationFilter
            ? {
                lat: locationFilter.lat,
                lng: locationFilter.lng,
                radiusKm: locationFilter.radiusKm,
              } as LocationFilter
            : undefined,
        });

        return z.array(eventInfoSchema).parse(res.events);
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

export const eventsByRolesListSuspense = (
  userId: string | undefined,
  discoverableFilter: DiscoverableFilter,
  fromUnixSec: number,
  toUnixSec: number,
  limit: number,
  page: number,
  roles: EventUserRole[],
  getToken?: GetToken,
  teamId?: string,
) => {
  const fromInt = Math.floor(fromUnixSec);
  const toInt = Math.floor(toUnixSec);
  const limitInt = Math.floor(limit);
  const pageInt = Math.floor(page);

  return queryOptions({
    queryKey: [
      "eventsByRoles",
      userId,
      discoverableFilter,
      fromInt,
      toInt,
      limitInt,
      pageInt,
      roles,
    ],
    queryFn: async () => {
      if (!userId) return [];

      return withSpan(`query:backend:user:${userId}:events:roles`, async () => {
        const token = getToken ? await getToken() : null;
        const res = await zenaoClient.listEventsByUserRoles(
          {
            userId,
            roles,
            limit: limitInt,
            offset: pageInt * limitInt,
            from: BigInt(fromInt),
            to: BigInt(toInt),
            discoverableFilter: discoverableFilter,
          },
          { headers: buildQueryHeaders(token, teamId) },
        );

        return z.array(eventUserSchema).parse(res.events);
      });
    },
    enabled: !!userId,
  });
};

export const eventsByOrganizerList = (
  organizerId: string | undefined,
  discoverableFilter: DiscoverableFilter,
  fromUnixSec: number,
  toUnixSec: number,
  limit: number,
  getToken?: GetToken,
  teamId?: string,
) => {
  const fromInt = Math.floor(fromUnixSec);
  const toInt = Math.floor(toUnixSec);
  const limitInt = Math.floor(limit);

  return infiniteQueryOptions({
    queryKey: [
      "eventsByOrganizer",
      organizerId,
      discoverableFilter,
      fromInt,
      toInt,
      limitInt,
    ],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      if (!organizerId) return [];

      return withSpan(
        `query:backend:user:${organizerId}:events:role:organizer`,
        async () => {
          const token = getToken ? await getToken() : null;
          const res = await zenaoClient.listEventsByUserRoles(
            {
              userId: organizerId,
              roles: ["organizer"],
              limit: limitInt,
              offset: pageParam * limitInt,
              from: BigInt(fromInt),
              to: BigInt(toInt),
              discoverableFilter: discoverableFilter,
            },
            { headers: buildQueryHeaders(token, teamId) },
          );

          return z
            .array(eventUserSchema)
            .parse(res.events)
            .map((eu) => eu.event);
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
    enabled: !!organizerId,
  });
};

export const eventsByParticipantList = (
  participantId: string | null | undefined,
  discoverableFilter: DiscoverableFilter,
  fromUnixSec: number,
  toUnixSec: number,
  limit: number,
  getToken?: GetToken,
  teamId?: string,
) => {
  const fromInt = Math.floor(fromUnixSec);
  const toInt = Math.floor(toUnixSec);
  const limitInt = Math.floor(limit);

  return infiniteQueryOptions({
    queryKey: [
      "eventsByParticipant",
      participantId,
      discoverableFilter,
      fromInt,
      toInt,
      limitInt,
    ],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      if (!participantId) return [];

      return withSpan(
        `query:backend:user:${participantId}:events:role:participant`,
        async () => {
          const token = getToken ? await getToken() : null;
          const res = await zenaoClient.listEventsByUserRoles(
            {
              userId: participantId,
              roles: ["participant"],
              limit: limitInt,
              offset: pageParam * limitInt,
              from: BigInt(fromInt),
              to: BigInt(toInt),
              discoverableFilter: discoverableFilter,
            },
            { headers: buildQueryHeaders(token, teamId) },
          );

          return z
            .array(eventUserSchema)
            .parse(res.events)
            .map((eu) => eu.event);
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
    enabled: !!participantId,
  });
};
