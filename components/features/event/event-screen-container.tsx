import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { imageHeight, imageWidth } from "./constants";
import { ExclusiveEventGuard } from "./event-exclusive-guard";
import { eventOptions } from "@/lib/queries/event";
import { getQueryClient } from "@/lib/get-query-client";
import { ScreenContainer } from "@/components/layout/screen-container";

type Props = {
  id: string;
  children?: React.ReactNode;
};

export async function EventScreenContainer({ id, children }: Props) {
  const queryClient = getQueryClient();

  const eventData = await queryClient.fetchQuery(eventOptions(id));

  // XXX: not found?

  const exclusive = eventData.privacy?.eventPrivacy.case === "guarded";

  const content = (
    <ScreenContainer
      background={{
        src: eventData.imageUri,
        width: imageWidth,
        height: imageHeight,
      }}
    >
      {children}
    </ScreenContainer>
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {exclusive ? (
        <ExclusiveEventGuard
          eventId={id}
          title={eventData.title}
          imageUri={eventData.imageUri}
        >
          {content}
        </ExclusiveEventGuard>
      ) : (
        content
      )}
    </HydrationBoundary>
  );
}
