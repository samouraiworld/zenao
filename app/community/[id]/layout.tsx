import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import CommunityInfoLayout from "../community-info-layout";
import { getQueryClient } from "@/lib/get-query-client";
import { ScreenContainer } from "@/components/layout/screen-container";

// enable ssg for all events
export async function generateStaticParams() {
  return [];
}

// revalidate every 60 seconds
export const revalidate = 60;

async function CommunityPageLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children?: React.ReactNode;
}) {
  const _ = await params;
  const queryClient = getQueryClient();
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ScreenContainer
        background={{
          src: "ipfs://bafybeidrcgelzhfblffpsmo6jukdnzmvae7xhu5zud4nn3os6qzdxbesu4",
          width: 3840,
          height: 720,
        }}
      >
        <CommunityInfoLayout>{children}</CommunityInfoLayout>
      </ScreenContainer>
    </HydrationBoundary>
  );
}

export default CommunityPageLayout;
