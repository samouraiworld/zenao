import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import PostInfo from "./post-info";
import { getQueryClient } from "@/lib/get-query-client";
import { OrgType } from "@/lib/organization";
import { ScreenContainer } from "@/components/layout/screen-container";

interface PageProps {
  params: Promise<{ orgType: string; orgId: string; postId: string }>;
}

export default async function SocialFeedPostPage({ params }: PageProps) {
  const queryClient = getQueryClient();
  const { orgType, orgId, postId } = await params;

  if (orgType !== "community" && orgType !== "event") {
    notFound();
  }

  const pkgPath =
    orgType === "community"
      ? `gno.land/r/zenao/communities/c${orgId}`
      : `gno.land/r/zenao/events/e${orgId}`;

  const feedId = `${pkgPath}:main`;

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ScreenContainer>
        <PostInfo
          orgType={orgType as OrgType}
          orgId={orgId}
          postId={postId}
          feedId={feedId}
        />
      </ScreenContainer>
    </HydrationBoundary>
  );
}
