import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { ProfileInfo } from "./profile-info";
import { ScreenContainer } from "@/components/layout/screen-container";
import { getQueryClient } from "@/lib/get-query-client";
import {
  DEFAULT_EVENTS_LIMIT,
  eventsByOrganizerList,
} from "@/lib/queries/events-list";
import { profileOptions } from "@/lib/queries/profile";

type Props = {
  params: Promise<{ address: string }>;
};

export const revalidate = 60;

export async function generateStaticParams() {
  return [];
}

export default async function ProfilePage({ params }: Props) {
  const p = await params;
  const queryClient = getQueryClient();

  queryClient.prefetchQuery(profileOptions(p.address));

  // In seconds
  const now = Date.now() / 1000;
  queryClient.prefetchInfiniteQuery(
    eventsByOrganizerList(
      p.address,
      now,
      Number.MAX_SAFE_INTEGER,
      DEFAULT_EVENTS_LIMIT,
    ),
  );
  queryClient.prefetchInfiniteQuery(
    eventsByOrganizerList(p.address, now - 1, 0, DEFAULT_EVENTS_LIMIT),
  );

  return (
    <ScreenContainer>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ProfileInfo address={p.address} now={now} />
      </HydrationBoundary>
    </ScreenContainer>
  );
}
