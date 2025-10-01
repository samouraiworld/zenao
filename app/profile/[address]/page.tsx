import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { auth } from "@clerk/nextjs/server";
import { ProfileInfo } from "./profile-info";
import { ScreenContainer } from "@/components/layout/screen-container";
import { getQueryClient } from "@/lib/get-query-client";
import {
  DEFAULT_EVENTS_LIMIT,
  eventsByOrganizerList,
} from "@/lib/queries/events-list";
import { profileOptions } from "@/lib/queries/profile";
import { userAddressOptions } from "@/lib/queries/user";
import { DiscoverableFilter } from "@/app/gen/zenao/v1/zenao_pb";

type Props = {
  params: Promise<{ address: string }>;
};

export const revalidate = 60;

export async function generateStaticParams() {
  return [];
}

export default async function ProfilePage({ params }: Props) {
  const p = await params;
  const { getToken, userId } = await auth();
  const queryClient = getQueryClient();
  const userAddress = await queryClient.fetchQuery(
    userAddressOptions(getToken, userId),
  );
  const isOwner = userAddress === p.address;
  // The connected user can see his both discoverable and undiscoverable events
  const discoverableFilter = isOwner
    ? DiscoverableFilter.UNSPECIFIED
    : DiscoverableFilter.DISCOVERABLE;

  queryClient.prefetchQuery(profileOptions(p.address));

  // In seconds
  const now = Date.now() / 1000;
  queryClient.prefetchInfiniteQuery(
    eventsByOrganizerList(
      p.address,
      discoverableFilter,
      now,
      Number.MAX_SAFE_INTEGER,
      DEFAULT_EVENTS_LIMIT,
    ),
  );
  queryClient.prefetchInfiniteQuery(
    eventsByOrganizerList(
      p.address,
      discoverableFilter,
      now - 1,
      0,
      DEFAULT_EVENTS_LIMIT,
    ),
  );

  return (
    <ScreenContainer>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ProfileInfo address={p.address} now={now} />
      </HydrationBoundary>
    </ScreenContainer>
  );
}
