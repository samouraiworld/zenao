import { Suspense } from "react";
import MembersTable from "./members-table";
import DashboardMembersPageLoading from "./members-table-loading";

export default function DashboardMembersPage() {
  return (
    <Suspense fallback={<DashboardMembersPageLoading />}>
      <MembersTable />
    </Suspense>
  );
}
