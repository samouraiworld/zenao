import { notFound } from "next/navigation";
import CommunityMainSections from "@/components/features/community/community-main-sections";
import { communityTabsSchema } from "@/types/schemas";

type PageProps = {
  params: Promise<{ id: string; tab: string }>;
};

async function CommunityPage({ params }: PageProps) {
  const { id: communityId, tab } = await params;
  const section = await communityTabsSchema.safeParseAsync(tab);

  if (section.error) {
    notFound();
  }

  return (
    <CommunityMainSections communityId={communityId} section={section.data} />
  );
}

export default CommunityPage;
