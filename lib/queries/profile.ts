import { queryOptions } from "@tanstack/react-query";
import {
  create as createBatcher,
  windowScheduler,
  keyResolver,
} from "@yornaath/batshit";
import { withSpan } from "../tracer";
import { zenaoClient } from "../zenao-client";

export type GnoProfile = {
  userId: string;
  displayName: string;
  bio: string;
  avatarUri: string;
  isTeam: boolean;
};

export type UserProfile = Omit<GnoProfile, "userId">;

export const profileOptions = (userId: string | null | undefined) => {
  return queryOptions<UserProfile | null>({
    queryKey: ["profile", userId],
    queryFn: async () => {
      if (!userId) {
        return null;
      }

      const profile = await profiles.fetch(userId);

      return profile;
    },
  });
};
export const profiles = createBatcher({
  fetcher: async (userIds: string[]) => {
    if (userIds.length === 0) {
      return [];
    }

    return withSpan(`query:backend:profiles:${userIds.join(",")}`, async () => {
      const res = await zenaoClient.getUsersProfile({
        ids: userIds,
      });
      return res.profiles;
    });
  },
  // when we call profiles.fetch, this will resolve the correct user using the field `userId`
  resolver: keyResolver("userId"),
  // this will batch all calls to profiles.fetch that are made within 10 milliseconds.
  scheduler: windowScheduler(10),
});
