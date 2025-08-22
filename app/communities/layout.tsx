import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { ScreenContainer } from "@/components/layout/screen-container";
import { getQueryClient } from "@/lib/get-query-client";
import {
  communitiesList,
  DEFAULT_COMMUNITIES_LIMIT,
} from "@/lib/queries/community";

type CommunitiesLayoutProps = {
  children: React.ReactNode;
};

function CommunitiesLayout({ children }: CommunitiesLayoutProps) {
  const queryClient = getQueryClient();

  queryClient.prefetchInfiniteQuery(communitiesList(DEFAULT_COMMUNITIES_LIMIT));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ScreenContainer>{children}</ScreenContainer>
    </HydrationBoundary>
  );
}

export default CommunitiesLayout;
