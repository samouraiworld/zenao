import { EventTabs } from "./event-tabs";

type Props = {
  params: Promise<{ id: string }>;
  children?: React.ReactNode;
};

export default async function TabsLayout({ params, children }: Props) {
  const { id: eventId } = await params;
  return <EventTabs eventId={eventId}>{children}</EventTabs>;
}
