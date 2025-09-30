import PostInfo from "./post-info";
import { EventScreenContainer } from "@/components/features/event/event-screen-container";

type PageProps = {
  params: Promise<{ id: string; postId: string }>;
};

export default async function PostDetailsPage({ params }: PageProps) {
  const { id: eventId, postId } = await params;

  return (
    <EventScreenContainer id={eventId}>
      <PostInfo eventId={eventId} postId={postId} />
    </EventScreenContainer>
  );
}
