"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { memo } from "react";
import { useAuth } from "@clerk/nextjs";
import { useEditUserProfile } from "@/lib/mutations/profile";
import { profileOptions } from "@/lib/queries/profile";
import { userInfoOptions } from "@/lib/queries/user";
import {
  deserializeWithFrontMatter,
  serializeWithFrontMatter,
} from "@/lib/serialization";
import {
  PortfolioItem,
  gnoProfileDetailsSchema,
  GnoProfileDetails,
  RealmId,
} from "@/types/schemas";
import { MarkdownPreview } from "@/components/widgets/markdown-preview";
import { addressFromRealmId } from "@/lib/gno";
import { PortfolioTab } from "@/components/portfolio/portfolio-tab";

const MemoizedVideoPreview = memo(({ uri }: { uri: string }) => (
  <MarkdownPreview
    className="w-full pointer-events-none"
    markdownString={uri}
  />
));
MemoizedVideoPreview.displayName = "MemoizedVideoPreview";

type UserPortfolioProps = {
  realmId: RealmId;
};

export default function ProfilePortfolio({ realmId }: UserPortfolioProps) {
  const { getToken, userId } = useAuth();

  const address = addressFromRealmId(realmId);
  const { data: userProfile } = useSuspenseQuery(profileOptions(realmId));

  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const loggedUserAddress = addressFromRealmId(userInfo?.realmId);
  const isOwner = loggedUserAddress === address;

  const profile = deserializeWithFrontMatter({
    serialized: userProfile?.bio ?? "",
    schema: gnoProfileDetailsSchema,
    defaultValue: {
      bio: "",
      socialMediaLinks: [],
      location: "",
      shortBio: "",
      bannerUri: "",
      experiences: [],
      skills: [],
      portfolio: [],
    },
    contentFieldName: "bio",
  });

  const { portfolio } = profile;

  const { editUser } = useEditUserProfile();

  const onSave = async (newPortfolio: PortfolioItem[]) => {
    try {
      const token = await getToken();
      if (!token) throw new Error("invalid clerk token");

      const bio = serializeWithFrontMatter<Omit<GnoProfileDetails, "bio">>(
        profile.bio,
        { ...profile, portfolio: newPortfolio },
      );

      await editUser({
        realmId: address,
        token,
        avatarUri: userProfile?.avatarUri ?? "",
        displayName: userProfile?.displayName ?? "",
        bio,
      });
    } catch (error) {
      throw error;
    }
  };
  return (
    <PortfolioTab
      portfolioItems={portfolio}
      isOwner={isOwner}
      onSave={onSave}
    />
  );
}
