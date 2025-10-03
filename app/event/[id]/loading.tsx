import { EventInfoLayoutSkeleton } from "./(main)/@info/event-info-layout";
import { ScreenContainer } from "@/components/layout/screen-container";

export default function EventLoading() {
  return (
    <ScreenContainer>
      <EventInfoLayoutSkeleton />
    </ScreenContainer>
  );
}
