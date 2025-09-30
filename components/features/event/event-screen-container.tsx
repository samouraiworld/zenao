import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import { imageHeight, imageWidth } from "./constants";
import { ExclusiveEventGuard } from "./event-exclusive-guard";
import { eventOptions } from "@/lib/queries/event";
import { getQueryClient } from "@/lib/get-query-client";
import { ScreenContainer } from "@/components/layout/screen-container";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";

type Props = {
  id: string;
  children?: React.ReactNode;
};

export async function EventScreenContainer({ id, children }: Props) {
  const queryClient = getQueryClient();

  let eventData: EventInfo;
  try {
    eventData = await queryClient.fetchQuery(eventOptions(id));
  } catch {
    notFound();
  }

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
