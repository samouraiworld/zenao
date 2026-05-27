import EventsPageLayout from "./event/events-page-layout";

export default function DashboardHome() {
  const now = Date.now() / 1000;

  return <EventsPageLayout now={now} />;
}
