import EventsTable from "@/components/features/dashboard/home/events-table";
import Heading from "@/components/widgets/texts/heading";

export default function DashboardHome() {
  const now = Date.now() / 1000;

  return (
    <div className="flex flex-col gap-6">
      <Heading level={1} className="text-2xl">
        Events
      </Heading>

      <div className="flex flex-col gap-4">
        <EventsTable now={now} />
      </div>
    </div>
  );
}
