import DashboardEventTabs from "./dashboard-event-tabs";

type Props = {
  params: Promise<{ id: string }>;
  children?: React.ReactNode;
};

export default async function TabsLayout({ children, params }: Props) {
  const { id: eventId } = await params;

  return <DashboardEventTabs eventId={eventId}>{children}</DashboardEventTabs>;
}
