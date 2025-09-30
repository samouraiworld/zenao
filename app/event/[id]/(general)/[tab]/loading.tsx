import { EventInfoLayoutSkeleton } from "./event-info-layout";
import { ScreenContainer } from "@/components/layout/screen-container";

export default function Loading() {
  // Or a custom loading skeleton component
  return (
    <ScreenContainer>
      <EventInfoLayoutSkeleton />
    </ScreenContainer>
  );
}
