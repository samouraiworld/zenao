"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { memo } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  communityInfo as communityInfoQuery,
  communityUserRoles,
} from "@/lib/queries/community";
import {
  deserializeWithFrontMatter,
  serializeWithFrontMatter,
} from "@/lib/serialization";
import {
  CommunityDetails,
  communityDetailsSchema,
  PortfolioItem,
} from "@/types/schemas";
import { useEditCommunity } from "@/lib/mutations/community-edit";
import { zenaoClient } from "@/lib/zenao-client";
import { userInfoOptions } from "@/lib/queries/user";
import { MarkdownPreview } from "@/components/widgets/markdown-preview";

import { useAnalyticsEvents } from "@/hooks/use-analytics-events";
import { PortfolioTab } from "@/components/portfolio/portfolio-tab";

type CommunityPortfolioProps = {
  communityId: string;
};

const MemoizedVideoPreview = memo(({ uri }: { uri: string }) => (
  <MarkdownPreview
    className="w-full pointer-events-none"
    markdownString={uri}
  />
));
MemoizedVideoPreview.displayName = "MemoizedVideoPreview";

export default function CommunityPortfolio({
  communityId,
}: CommunityPortfolioProps) {
  const { getToken, userId } = useAuth();
  const { trackEvent } = useAnalyticsEvents();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const { data: userRoles = [] } = useSuspenseQuery(
    communityUserRoles(communityId, userInfo?.userId),
  );

  const { data: communityInfo } = useSuspenseQuery(
    communityInfoQuery(communityId),
  );
  const { data: administrators } = useSuspenseQuery({
    queryKey: ["communityAdmins", communityId],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("invalid clerk token");
      const res = await zenaoClient.getCommunityAdministrators(
        { communityId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return res.administrators;
    },
    initialData: [],
  });

  const isAdmin = userRoles.includes("administrator");

  const { portfolio, ...otherDetails } = deserializeWithFrontMatter({
    contentFieldName: "description",
    schema: communityDetailsSchema,
    serialized: communityInfo?.description ?? "",
    defaultValue: {
      description: "",
      shortDescription: "",
      portfolio: [],
      socialMediaLinks: [],
    },
  });

  const { mutateAsync: editCommunity } = useEditCommunity();

  const onSave = async (
    newPortfolio: PortfolioItem[],
    itemType: "image" | "audio" | "video",
  ) => {
    const token = await getToken();
    if (!token) throw new Error("invalid clerk token");

    const description = serializeWithFrontMatter<
      Omit<CommunityDetails, "description">
    >(otherDetails.description, {
      shortDescription: otherDetails.shortDescription,
      portfolio: newPortfolio,
      socialMediaLinks: otherDetails.socialMediaLinks,
    });

    await editCommunity({
      ...communityInfo,
      communityId,
      administrators,
      token,
      description,
    });

    trackEvent("PortfolioUpdated", {
      props: {
        orgType: "community",
        orgId: communityId,
        itemType,
      },
    });
  };

  return (
    <PortfolioTab
      portfolioItems={portfolio}
      isOwner={isAdmin}
      onSave={onSave}
    />
  );
}
