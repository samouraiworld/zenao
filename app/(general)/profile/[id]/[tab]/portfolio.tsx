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
} from "@/types/schemas";
import { MarkdownPreview } from "@/components/widgets/markdown-preview";
import { addressFromRealmId } from "@/lib/gno";
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
  const { getToken, userId: currentUserId } = useAuth();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, currentUserId),
  );
  const userRealmId = userInfo?.realmId || "";
  const address = addressFromRealmId(userRealmId);
  const loggedUserAddress = addressFromRealmId(userInfo?.realmId);
  const isOwner = loggedUserAddress === address;

  const realmId = `gno.land/r/zenao/users/u${userId}`;
  const { data: consultedProfile } = useSuspenseQuery(profileOptions(realmId));

  const profile = deserializeWithFrontMatter({
    serialized: consultedProfile?.bio ?? "",
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
    const token = await getToken();
    if (!token) throw new Error("invalid clerk token");

    const bio = serializeWithFrontMatter<Omit<GnoProfileDetails, "bio">>(
      profile.bio,
      { ...profile, portfolio: newPortfolio },
    );

    await editUser({
      realmId: address,
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
