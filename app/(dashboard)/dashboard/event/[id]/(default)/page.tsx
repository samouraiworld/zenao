import { notFound } from "next/navigation";
import { MarkdownPreview } from "@/components/widgets/markdown-preview";
import { getQueryClient } from "@/lib/get-query-client";
import { eventOptions } from "@/lib/queries/event";

interface DashboardEventDetailsDescriptionProps {
  params: Promise<{ id: string }>;
}

export default async function DashboardEventDetailsDescription({
  params,
}: DashboardEventDetailsDescriptionProps) {
  const { id: eventId } = await params;

  const queryClient = getQueryClient();

  let eventInfo;

  try {
    eventInfo = await queryClient.fetchQuery(eventOptions(eventId));
  } catch {
    notFound();
  }

  return <MarkdownPreview markdownString={eventInfo.description} />;
}
