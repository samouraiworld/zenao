import { queryOptions } from "@tanstack/react-query";
import {
  create as createBatcher,
  windowScheduler,
  keyResolver,
} from "@yornaath/batshit";
import { withSpan } from "../tracer";
import { zenaoClient } from "../zenao-client";
import { userIdFromPkgPath } from "./user";

export type GnoProfile = {
  address: string;
  displayName: string;
  bio: string;
  avatarUri: string;
};

export type UserProfile = Omit<GnoProfile, "address">;

export const profileOptions = (realmId: string | null | undefined) => {
  return queryOptions<UserProfile | null>({
    queryKey: ["profile", realmId],
    queryFn: async () => {
      if (!realmId) {
        return null;
      }

      const profile = await profiles.fetch(realmId);

      return profile;
    },
  });
};
export const profiles = createBatcher({
  fetcher: async (realmIDs: string[]) => {
    if (realmIDs.length === 0) {
      return [];
    }

    const ids = realmIDs.map((realmId) => userIdFromPkgPath(realmId));
    return withSpan(`query:backend:profiles:${ids.join(",")}`, async () => {
      const res = await zenaoClient.getUsersProfile({
        ids,
      });
      return res.profiles;
    });
  },
  // when we call profiles.fetch, this will resolve the correct user using the field `address`
  resolver: keyResolver("address"),
  // this will batch all calls to profiles.fetch that are made within 10 milliseconds.
  scheduler: windowScheduler(10),
});
