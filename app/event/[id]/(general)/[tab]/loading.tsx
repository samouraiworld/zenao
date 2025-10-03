import { EventInfoLayoutSkeleton } from "./event-info-layout";
import { ScreenContainer } from "@/components/layout/screen-container";

export default function Loading() {
  return (
    <ScreenContainer>
      <EventInfoLayoutSkeleton />
    </ScreenContainer>
  );
}
