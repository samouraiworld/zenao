import { notFound } from "next/navigation";
import { profileTabsSchema } from "@/types/schemas";
import ProfileMainSections from "@/components/features/profile/profile-main-sections";

type PageProps = {
  params: Promise<{ id: string; tab: string }>;
};

async function ProfilePage({ params }: PageProps) {
  console.log("asfausaiuazazassioajsa");
  const { id: userId, tab } = await params;
  const section = await profileTabsSchema.safeParseAsync(tab);
  console.log("sectionsectionsectionsectionsection", section);

  const realmId = `gno.land/r/zenao/users/u${userId}`;
  console.log("realmIdrealmIdrealmIdrealmId", realmId);

  if (section.error) {
    notFound();
  }

  const now = Date.now() / 1000;

  return (
    <ProfileMainSections userId={userId} section={section.data} now={now} />
  );
}

export default ProfilePage;
