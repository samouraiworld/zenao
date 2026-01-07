"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Person, WithContext } from "schema-dts";
import { useTranslations } from "next-intl";

import { profileOptions } from "@/lib/queries/profile";
import ProfileHeader from "@/components/features/profile/profile-header";

type ProfileInfoLayoutProps = {
  userId: string;
  children: React.ReactNode;
};

export function ProfileInfoLayout({
  userId,
  children,
}: ProfileInfoLayoutProps) {
  const t = useTranslations("profile-info");

  const { data: profile } = useSuspenseQuery(profileOptions(userId));

  // profileOptions can return array of object with empty string (except address)
  // So to detect if a user doesn't exist we have to check if all strings are empty (except address)
  if (!profile?.bio && !profile?.displayName && !profile?.avatarUri) {
    return <p>{t("profile-not-exist")}</p>;
  }

  const jsonLd: WithContext<Person> = {
    "@context": "https://schema.org",
    "@type": "Person",
    alternateName: profile?.displayName,
    image: profile?.avatarUri,
    knowsAbout: profile?.bio,
  };

  return (
    <div className="flex flex-col gap-10 mb-8 md:mb-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <ProfileHeader
        userId={userId}
        displayName={profile.displayName}
        bio={profile.bio}
        avatarUri={profile.avatarUri}
      />

      {children}
    </div>
  );
}
