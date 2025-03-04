"use client";

import { CreatePollForm } from "./CreatePollForm";
import { ScreenContainer } from "@/components/layout/ScreenContainer";

export default function CreatePollPage() {
  return (
    <ScreenContainer isSignedOutModal>
      <CreatePollForm />
    </ScreenContainer>
  );
}
