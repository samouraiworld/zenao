import AdministratorsTable from "./administrators-table";
import { CommunityAdministratorsEditionContextProvider } from "./community-administrators-edition-context-provider";

export default function DashboardAdministratorsPage() {
  return (
    <CommunityAdministratorsEditionContextProvider>
      <AdministratorsTable />
    </CommunityAdministratorsEditionContextProvider>
  );
}
