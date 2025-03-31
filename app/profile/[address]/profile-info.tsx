"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Person, WithContext } from "schema-dts";
import ProfileHeader from "./profile-header";
import { profileOptions } from "@/lib/queries/profile";
import Heading from "@/components/texts/heading";
import { eventsByCreatorList } from "@/lib/queries/events-list";
import { EventCard } from "@/components/cards/event-card";

export function ProfileInfo({
  address,
  now,
}: {
  address: string;
  now: number;
}) {
  const { data: profile } = useSuspenseQuery(profileOptions(address));
  const { data: upcomingEvents } = useSuspenseQuery(
    eventsByCreatorList(address, now, Number.MAX_SAFE_INTEGER, 20),
  );
  const { data: pastEvents } = useSuspenseQuery(
    eventsByCreatorList(address, now - 1, 0, 20),
  );

  // profileOptions can return array of object with empty string (except address)
  // So to detect if a user doesn't exist we have to check if all strings are empty (except address)
  if (!profile?.bio && !profile?.displayName && !profile?.avatarUri) {
    return <p>{`Profile doesn't exist`}</p>;
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
      <div className="flex flex-col sm:flex-row w-full sm:h-full gap-10">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ProfileHeader
          address={profile.address}
          displayName={profile.displayName}
          bio={profile.bio}
          avatarUri={profile.avatarUri}
        />
      </div>
      <Heading level={2} size="lg">
        Hosting events ({upcomingEvents.length})
      </Heading>

      <div className="flex flex-col gap-0">
        {upcomingEvents.map((evt) => (
          <EventCard key={evt.pkgPath} evt={evt} />
        ))}
      </div>

      <Heading level={2} size="lg">
        Past events ({pastEvents.length})
      </Heading>

      <div className="flex flex-col gap-0">
        {pastEvents.map((evt) => (
          <EventCard key={evt.pkgPath} evt={evt} />
        ))}
      </div>
    </div>
  );
}
