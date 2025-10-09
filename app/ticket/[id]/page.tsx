import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { TicketsInfo } from "./tickets-info";
import {
  ScreenContainer,
  ScreenContainerCentered,
} from "@/components/layout/screen-container";
import { getQueryClient } from "@/lib/get-query-client";
import { userInfoOptions } from "@/lib/queries/user";
import { eventOptions } from "@/lib/queries/event";
import { eventUserRoles } from "@/lib/queries/event-users";
import { imageWidth, imageHeight } from "@/app/event/[id]/constants";
import { eventTickets } from "@/lib/queries/ticket";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TicketsPage({ params }: PageProps) {
  const { id } = await params;
  const queryClient = getQueryClient();
  const t = await getTranslations("tickets");

  const { getToken, userId } = await auth();
  const token = await getToken();

  const userAddrOpts = userInfoOptions(getToken, userId);
  const address = await queryClient.fetchQuery(userAddrOpts);

  if (!token || !address) {
    return (
      <ScreenContainerCentered isSignedOutModal>
        {t("log-in")}
      </ScreenContainerCentered>
    );
  }

  let eventData;
  try {
    eventData = await queryClient.fetchQuery({
      ...eventOptions(id),
    });
  } catch (err) {
    console.error("error", err);
    notFound();
  }

  // Check if user is a participant
  const roles = await queryClient.fetchQuery(eventUserRoles(id, address));

  if (!roles.includes("participant")) {
    // For now not found handler
    notFound();
  }

  queryClient.prefetchQuery(eventTickets(id, getToken));

  return (
    <ScreenContainer
      background={{
        src: eventData.imageUri,
        width: imageWidth,
        height: imageHeight,
      }}
    >
      <TicketsInfo id={id} />
    </ScreenContainer>
  );
}
