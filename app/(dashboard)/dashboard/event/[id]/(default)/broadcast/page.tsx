import { notFound } from "next/navigation";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";
import DashboardBroadcastForm from "./dashboard-broadcast-form";
import { getQueryClient } from "@/lib/get-query-client";
import { eventOptions } from "@/lib/queries/event";
import Text from "@/components/widgets/texts/text";

interface DashboardEventBroadcastPageProps {
  params: Promise<{ id: string }>;
}

export default async function DashboardEventBroadcastPage({
  params,
}: DashboardEventBroadcastPageProps) {
  const { id: eventId } = await params;

  const queryClient = getQueryClient();

  const t = await getTranslations("broadcast-email-form");

  let eventInfo;

  try {
    eventInfo = await queryClient.fetchQuery(eventOptions(eventId));
  } catch {
    notFound();
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="mb-12 space-y-8">
        <Text variant="secondary">{t("desc")}</Text>
        <DashboardBroadcastForm eventId={eventId} eventInfo={eventInfo} />
      </div>
    </HydrationBoundary>
  );
}
