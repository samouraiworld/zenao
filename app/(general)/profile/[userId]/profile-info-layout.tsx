"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Person, WithContext } from "schema-dts";
import { useTranslations } from "next-intl";

import { useQuery } from "wagmi/query";
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

  const { data: ipfsBio } = useQuery({
    queryKey: ["get", profile?.bio],
    queryFn: async () => {
      const res = await fetch(
        `https://${process.env.NEXT_PUBLIC_GATEWAY_URL}/ipfs/${profile?.bio.substring(7)}`,
      );
      const body = await res.bytes();
      return Buffer.from(body).toString();
    },
    enabled: profile?.bio.startsWith("ipfs://"),
  });

  // profileOptions can return array of object with empty string (except address)
  // So to detect if a user doesn't exist we have to check if all strings are empty (except address)
  if (!profile?.bio && !profile?.displayName && !profile?.avatarUri) {
    return <p>{t("profile-not-exist")}</p>;
  }

  const bio = profile.bio.startsWith("ipfs://") ? ipfsBio || "" : profile.bio;

  const jsonLd: WithContext<Person> = {
    "@context": "https://schema.org",
    "@type": "Person",
    alternateName: profile?.displayName,
    image: profile?.avatarUri,
    knowsAbout: bio as string, // XXX: TEMPORARY TYPE CAST
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
        bio={bio as string} // XXX: TEMPORARY TYPE CAST
        avatarUri={profile.avatarUri}
        isTeam={profile.isTeam}
      />

      {children}
    </div>
  );
}
