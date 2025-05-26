import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import { imageHeight, imageWidth } from "../../constants";
import { getQueryClient } from "@/lib/get-query-client";
import { eventOptions } from "@/lib/queries/event";
import { ScreenContainer } from "@/components/layout/ScreenContainer";

type Props = {
  params: Promise<{ id: string; postId: string }>;
};

// enable ssg for all events
export async function generateStaticParams() {
  return [];
}

// revalidate every 60 seconds
export const revalidate = 60;

async function PostDetailsPage({ params }: Props) {
  // Get Event
  const queryClient = getQueryClient();
  const p = await params;

  let eventData;
  try {
    eventData = await queryClient.fetchQuery({
      ...eventOptions(p.id),
    });
  } catch (err) {
    console.error("error", err);
    notFound();
  }

  // Fetch post
  // await queryClient.fetchQuery(postDetails(p.id, p.postId))
  // queryClient.prefetchQuery(postComments)

  // Fetch paginated comments

  return (
    <ScreenContainer
      background={{
        src: eventData.imageUri,
        width: imageWidth,
        height: imageHeight,
      }}
    >
      <HydrationBoundary state={dehydrate(queryClient)}>
        <>Post details</>
      </HydrationBoundary>
    </ScreenContainer>
  );
}

export default PostDetailsPage;
