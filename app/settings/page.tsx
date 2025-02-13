import { EditUserForm } from "./EditUserForm";
import { ScreenContainer } from "@/components/layout/ScreenContainer";

export default async function SettingsPage() {
  return (
    <ScreenContainer>
      <EditUserForm />
    </ScreenContainer>
  );
}
