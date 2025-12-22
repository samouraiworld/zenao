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

  const now = Date.now() / 1000;

  return (
    <CommunityMainSections
      communityId={communityId}
      section={section.data}
      now={now}
    />
  );
}

export default CommunityPage;
