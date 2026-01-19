import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";
import CreateCommunityForm from "./create-community-form";
import { getQueryClient } from "@/lib/get-query-client";
import {
  ScreenContainer,
  ScreenContainerCentered,
} from "@/components/layout/screen-container";
import getActor from "@/lib/utils/actor";

export default async function CreateCommunityPage() {
  const queryClient = getQueryClient();

  const t = await getTranslations("community-create-form");

  // Fetch actor
  const actor = await getActor();

  if (!actor) {
    return (
      <ScreenContainerCentered isSignedOutModal>
        <div className="flex flex-col items-center mx-auto md:max-w-5xl">
          {t("log-in")}
        </div>
      </ScreenContainerCentered>
    );
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ScreenContainer>
        <CreateCommunityForm dashboard />
      </ScreenContainer>
    </HydrationBoundary>
  );
}
