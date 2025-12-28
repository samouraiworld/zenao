import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { TicketsInfo } from "./tickets-info";
import {
  ScreenContainer,
  ScreenContainerCentered,
} from "@/components/layout/screen-container";
import { getQueryClient } from "@/lib/get-query-client";
import { eventOptions } from "@/lib/queries/event";
import { imageWidth, imageHeight } from "@/components/features/event/constants";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TicketsPage({ params }: PageProps) {
  const { id } = await params;
  const queryClient = getQueryClient();
  const t = await getTranslations("tickets");

  const { getToken } = await auth();
  const token = await getToken();

  if (!token) {
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
