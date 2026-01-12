import AdministratorsTable from "./administrators-table";
import { CommunityAdministratorsEditionContextProvider } from "@/components/providers/community-administrators-edition-context-provider";

export default function DashboardAdministratorsPage() {
  return (
    <CommunityAdministratorsEditionContextProvider>
      <AdministratorsTable />
    </CommunityAdministratorsEditionContextProvider>
  );
}
