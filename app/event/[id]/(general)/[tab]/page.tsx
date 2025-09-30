import { redirect, RedirectType } from "next/navigation";
import { EventInfoLayout } from "./event-info-layout";
import { eventInfoTabsSchema } from "@/types/schemas";
import { MainEventSections } from "@/components/features/event/event-main-sections";
import { EventScreenContainer } from "@/components/features/event/event-screen-container";

type PageProps = {
  params: Promise<{ id: string; tab: string }>;
};

export default async function EventSectionsPage({ params }: PageProps) {
  const { id, tab } = await params;
  const safeTab = await eventInfoTabsSchema.safeParseAsync(tab);

  if (!safeTab.success) {
    redirect(`/event/${id}`, RedirectType.replace);
  }

  return (
    <EventScreenContainer id={id}>
      <EventInfoLayout eventId={id}>
        <MainEventSections eventId={id} section={safeTab.data} />
      </EventInfoLayout>
    </EventScreenContainer>
  );
}
