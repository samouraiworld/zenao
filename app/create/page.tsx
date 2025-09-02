import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";
import { auth } from "@clerk/nextjs/server";
import { CreateEventForm } from "./create-event-form";
import { getQueryClient } from "@/lib/get-query-client";
import {
  ScreenContainer,
  ScreenContainerCentered,
} from "@/components/layout/screen-container";
import { userAddressOptions } from "@/lib/queries/user";
import {
  communitiesListByMember,
  DEFAULT_COMMUNITIES_LIMIT,
} from "@/lib/queries/community";

export default async function CreateEventPage() {
  const queryClient = getQueryClient();

  const t = await getTranslations("eventForm");

  // Fetch user
  const { getToken, userId } = await auth();
  const token = await getToken();

  const userAddrOpts = userAddressOptions(getToken, userId);
  const address = await queryClient.fetchQuery(userAddrOpts);

  if (!token || !address) {
    return (
      <ScreenContainerCentered isSignedOutModal>
        {t("log-in")}
      </ScreenContainerCentered>
    );
  }

  // Prefetch communities where user is admin
  console.log(address);
  const communitiesPages = await queryClient.fetchInfiniteQuery(
    communitiesListByMember(address, DEFAULT_COMMUNITIES_LIMIT),
  );

  console.log(communitiesPages.pages);
  // queryClient.prefetchQuery()

  return (
    <ScreenContainer isSignedOutModal>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <CreateEventForm />
      </HydrationBoundary>
    </ScreenContainer>
  );
}
