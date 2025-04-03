import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { ProfileInfo } from "./profile-info";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { getQueryClient } from "@/lib/get-query-client";
import { profileOptions } from "@/lib/queries/profile";
import { eventsByCreatorList } from "@/lib/queries/events-list";

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
  queryClient.prefetchQuery(
    eventsByCreatorList(p.address, now, Number.MAX_SAFE_INTEGER, 20),
  );
  queryClient.prefetchQuery(eventsByCreatorList(p.address, now - 1, 0, 20));

  return (
    <ScreenContainer>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ProfileInfo address={p.address} now={now} />
      </HydrationBoundary>
    </ScreenContainer>
  );
}
