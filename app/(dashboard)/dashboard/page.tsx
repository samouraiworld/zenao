import EventsPageLayout from "./event/events-page-layout";
// import EventsTable from "@/components/features/dashboard/home/events-table";

export default function DashboardHome() {
  const now = Date.now() / 1000;

  return <EventsPageLayout now={now} />;
}
