import PayoutsConfiguration from "./payouts-configuration";
import { withCommunityRolesRestriction } from "@/lib/permissions/with-roles-required";

function DashboardCommunityPayoutsPage() {
  return <PayoutsConfiguration />;
}

export default withCommunityRolesRestriction(DashboardCommunityPayoutsPage, [
  "administrator",
]);
