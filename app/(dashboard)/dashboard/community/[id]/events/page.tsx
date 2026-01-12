import { Suspense } from "react";
import CommunityEventsTable from "./events-table";

export default function DashboardCommunityEventsPage() {
  return (
    <Suspense fallback={<div>Loading Events...</div>}>
      <CommunityEventsTable />
    </Suspense>
  );
}
