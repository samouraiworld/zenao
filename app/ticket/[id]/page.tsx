import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { TicketsInfo } from "./tickets-info";
import {
  ScreenContainer,
  ScreenContainerCentered,
} from "@/components/layout/ScreenContainer";
import { getQueryClient } from "@/lib/get-query-client";
import { userAddressOptions } from "@/lib/queries/user";
import { eventOptions } from "@/lib/queries/event";
import { profileOptions } from "@/lib/queries/profile";
import { eventUserRoles } from "@/lib/queries/event-users";
import { imageWidth, imageHeight } from "@/app/event/[id]/constants";

export async function generateStaticParams() {
  return [];
}

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TicketsPage({ params }: PageProps) {
  const { id } = await params;
  const queryClient = getQueryClient();

  const { getToken, userId } = await auth();
  const token = await getToken();

  const userAddrOpts = userAddressOptions(getToken, userId);
  const address = await queryClient.fetchQuery(userAddrOpts);

  if (!token || !address) {
    return (
      <ScreenContainerCentered isSignedOutModal>
        Log in to see your tickets
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

  queryClient.prefetchQuery(profileOptions(eventData.creator));

  // Check if user is a participant
  const roles = await queryClient.fetchQuery(eventUserRoles(id, address));

  if (!roles.includes("participant")) {
    // For now not found handler
    notFound();
  }

  // TODO prefetch ticket info

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
