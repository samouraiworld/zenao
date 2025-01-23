"use client";

import { CreateEventForm } from "@/components/form/CreateEventForm";
import { ScreenContainer } from "@/components/layout/ScreenContainer";

export default function CreateEventPage() {
  return (
    <ScreenContainer isSignedOutModal>
      <CreateEventForm />
    </ScreenContainer>
  );
}
