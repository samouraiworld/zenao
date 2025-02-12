import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Text } from "@/components/texts/DefaultText";

export default async function SettingsPage() {
  return (
    <ScreenContainer>
      <div>
        <Text>Username</Text>
        <Text>Bio</Text>
        <Text>Avatar URI</Text>
      </div>
    </ScreenContainer>
  );
}
