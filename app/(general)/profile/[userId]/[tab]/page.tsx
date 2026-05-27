import { notFound } from "next/navigation";
import { profileTabsSchema } from "@/types/schemas";
import ProfileMainSections from "@/components/features/profile/profile-main-sections";

type PageProps = {
  params: Promise<{ userId: string; tab: string }>;
};

async function ProfilePage({ params }: PageProps) {
  const { userId, tab } = await params;
  const section = await profileTabsSchema.safeParseAsync(tab);

  if (section.error) {
    notFound();
  }

  const now = Date.now() / 1000;

  return (
    <ProfileMainSections userId={userId} section={section.data} now={now} />
  );
}

export default ProfilePage;
