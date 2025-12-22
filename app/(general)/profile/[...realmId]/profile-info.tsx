"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Person, WithContext } from "schema-dts";
import { useState } from "react";
import { useTranslations } from "next-intl";
import ProfileHeader from "./profile-header";

import { profileOptions } from "@/lib/queries/profile";
import { ProfileTabsSchemaType, RealmId } from "@/types/schemas";
import { addressFromRealmId } from "@/lib/gno";
import ProfileEvents from "@/app/profile/[address]/(general)/@tabs/events/page";
import ProfilePortfolio from "@/app/profile/[address]/(general)/@tabs/portfolio/page";

export function ProfileInfo({
  realmId,
  now,
}: {
  realmId: RealmId;
  now: number;
}) {
  const t = useTranslations("profile-info");
  const address = addressFromRealmId(realmId);
  const { data: profile } = useSuspenseQuery(profileOptions(realmId));
  const [activeTab, setActiveTab] = useState<ProfileTabsSchemaType>("events");

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
    <div className="flex flex-col gap-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <ProfileHeader
        address={address}
        displayName={profile.displayName}
        bio={profile.bio}
        avatarUri={profile.avatarUri}
      />

      <div className="flex gap-4 border-b border-muted">
        {(["events", "portfolio"] as ProfileTabsSchemaType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium transition border-b-2 ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground"
            }`}
          >
            {t(tab)}
          </button>
        ))}
      </div>

      <div>
        {activeTab === "events" && (
          <ProfileEvents realmId={realmId} now={now} />
        )}
        {activeTab === "portfolio" && <ProfilePortfolio realmId={realmId} />}
      </div>
    </div>
  );
}
