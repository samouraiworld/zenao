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
  ProfileDetails,
  profileDetailsSchema,
} from "@/types/schemas";
import { MarkdownPreview } from "@/components/widgets/markdown-preview";

import { PortfolioTab } from "@/components/portfolio/portfolio-tab";

type ProfilePortfolioProps = {
  userId: string;
};

const MemoizedVideoPreview = memo(({ uri }: { uri: string }) => (
  <MarkdownPreview
    className="w-full pointer-events-none"
    markdownString={uri}
  />
));
MemoizedVideoPreview.displayName = "MemoizedVideoPreview";

export default function ProfilePortfolio({ userId }: ProfilePortfolioProps) {
  const { getToken, userId: authId } = useAuth();
  const { data: authUserInfo } = useSuspenseQuery(
    userInfoOptions(getToken, authId),
  );
  const isOwner = authUserInfo?.userId === userId;

  const { data: consultedProfile } = useSuspenseQuery(profileOptions(userId));

  const profile = deserializeWithFrontMatter({
    serialized: consultedProfile?.bio ?? "",
    schema: profileDetailsSchema,
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
    const token = await getToken();
    if (!token) throw new Error("invalid clerk token");

    const bio = serializeWithFrontMatter<Omit<ProfileDetails, "bio">>(
      profile.bio,
      { ...profile, portfolio: newPortfolio },
    );

    await editUser({
      userId,
      token,
      avatarUri: consultedProfile?.avatarUri ?? "",
      displayName: consultedProfile?.displayName ?? "",
      bio,
    });
  };
  return (
    <PortfolioTab
      portfolioItems={portfolio}
      isOwner={isOwner}
      onSave={onSave}
    />
  );
}
