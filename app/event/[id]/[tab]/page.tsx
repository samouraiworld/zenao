import { redirect, RedirectType } from "next/navigation";
import { MainEventSections } from "../main-event-sections";
import { eventInfoTabsSchema } from "@/components/form/types";

export const revalidate = 60;

export async function generateStaticParams() {
  return [];
}

type PageProps = {
  params: Promise<{ id: string; tab: string }>;
};

export default async function EventSectionsPage({ params }: PageProps) {
  const { id, tab } = await params;
  const safeTab = await eventInfoTabsSchema.safeParseAsync(tab);

  if (!safeTab.success) {
    redirect(`/event/${id}`, RedirectType.replace);
  }

  console.log(tab, safeTab.data);

  return <MainEventSections eventId={id} section={safeTab.data} />;
}
