import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";
import { auth } from "@clerk/nextjs/server";
import { CreateEventForm } from "../../../(dashboard)/dashboard/event/create/create-event-form";
import { getQueryClient } from "@/lib/get-query-client";
import {
  ScreenContainer,
  ScreenContainerCentered,
} from "@/components/layout/screen-container";
import { userInfoOptions } from "@/lib/queries/user";
import {
  communitiesByUserRolesList,
  DEFAULT_COMMUNITIES_LIMIT,
} from "@/lib/queries/community";

export default async function CreateEventPage() {
  const queryClient = getQueryClient();

  const t = await getTranslations("eventForm");

  // Fetch user
  const { getToken, userId } = await auth();
  const token = await getToken();

  const userAddrOpts = userInfoOptions(getToken, userId);
  const userInfo = await queryClient.fetchQuery(userAddrOpts);
  const userRealmId = userInfo?.realmId;

  if (!token || !userRealmId) {
    return (
      <ScreenContainerCentered isSignedOutModal>
        <div className="flex flex-col items-center mx-auto md:max-w-5xl">
          {t("log-in")}
        </div>
      </ScreenContainerCentered>
    );
  }

  // Prefetch communities where logged in user is administrator
  queryClient.prefetchInfiniteQuery(
    communitiesByUserRolesList(
      userRealmId,
      ["administrator"],
      DEFAULT_COMMUNITIES_LIMIT,
      getToken,
    ),
  );

  return (
    <ScreenContainer isSignedOutModal>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <CreateEventForm />
      </HydrationBoundary>
    </ScreenContainer>
  );
}
