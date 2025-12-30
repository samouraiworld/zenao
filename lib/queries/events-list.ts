import {
  InfiniteData,
  infiniteQueryOptions,
  queryOptions,
  UseInfiniteQueryOptions,
} from "@tanstack/react-query";
import { withSpan } from "../tracer";
import { zenaoClient } from "../zenao-client";
import { userIdFromPkgPath } from "./user";
import { EventInfo, DiscoverableFilter } from "@/app/gen/zenao/v1/zenao_pb";

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
      return withSpan(`query:backend:events`, async () => {
        const res = await zenaoClient.listEvents({
          limit: limitInt,
          offset: pageParam * limitInt,
          from: BigInt(fromInt),
          to: BigInt(toInt),
          discoverableFilter: DiscoverableFilter.DISCOVERABLE,
        });

        return res.events;
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

export const eventsByOrganizerListSuspense = (
  organizerRealmId: string | undefined,
  discoverableFilter: DiscoverableFilter,
  fromUnixSec: number,
  toUnixSec: number,
  limit: number,
  page: number,
) => {
  const fromInt = Math.floor(fromUnixSec);
  const toInt = Math.floor(toUnixSec);
  const limitInt = Math.floor(limit);
  const pageInt = Math.floor(page);

  return queryOptions({
    queryKey: [
      "eventsByOrganizer",
      organizerRealmId,
      discoverableFilter,
      fromInt,
      toInt,
      limitInt,
      pageInt,
    ],
    queryFn: async () => {
      if (!organizerRealmId) return [];

      return withSpan(
        `query:backend:user:${userIdFromPkgPath(organizerRealmId)}:events:role:organizer`,
        async () => {
          const res = await zenaoClient.listEventsByUserRoles({
            userId: userIdFromPkgPath(organizerRealmId),
            roles: ["organizer"],
            limit: limitInt,
            offset: pageInt * limitInt,
            from: BigInt(fromInt),
            to: BigInt(toInt),
            discoverableFilter: discoverableFilter,
          });
          return res.events.map((eu) => eu.event!);
        },
      );
    },
    enabled: !!organizerRealmId,
  });
};

export const eventsByOrganizerList = (
  organizerRealmId: string | undefined,
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
      organizerRealmId,
      discoverableFilter,
      fromInt,
      toInt,
      limitInt,
    ],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      if (!organizerRealmId) return [];

      return withSpan(
        `query:backend:user:${userIdFromPkgPath(organizerRealmId)}:events:role:organizer`,
        async () => {
          const res = await zenaoClient.listEventsByUserRoles({
            userId: userIdFromPkgPath(organizerRealmId),
            roles: ["organizer"],
            limit: limitInt,
            offset: pageParam * limitInt,
            from: BigInt(fromInt),
            to: BigInt(toInt),
            discoverableFilter: discoverableFilter,
          });
          return res.events.map((eu) => eu.event!);
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
    enabled: !!organizerRealmId,
  });
};

export const eventsByParticipantList = (
  participantRealmId: string,
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
      participantRealmId,
      discoverableFilter,
      fromInt,
      toInt,
      limitInt,
    ],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      return withSpan(
        `query:backend:user:${userIdFromPkgPath(participantRealmId)}:events:role:participant`,
        async () => {
          const res = await zenaoClient.listEventsByUserRoles({
            userId: userIdFromPkgPath(participantRealmId),
            roles: ["participant"],
            limit: limitInt,
            offset: pageParam * limitInt,
            from: BigInt(fromInt),
            to: BigInt(toInt),
            discoverableFilter: discoverableFilter,
          });
          return res.events.map((eu) => eu.event!);
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
