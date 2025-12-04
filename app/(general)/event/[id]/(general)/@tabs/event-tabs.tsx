"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSelectedLayoutSegment } from "next/navigation";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/shadcn/tabs";
import { Separator } from "@/components/shadcn/separator";
import { userInfoOptions } from "@/lib/queries/user";
import { eventUserRoles } from "@/lib/queries/event-users";
import {
  EventInfoTabsSchemaType,
  socialFeedPostFormSchema,
  SocialFeedPostFormSchemaType,
} from "@/types/schemas";
import SocialFeedForm from "@/components/social-feed/forms/social-feed-form";

export function EventTabs({
  eventId,
  children,
}: {
  eventId: string;
  children?: React.ReactNode;
}) {
  const t = useTranslations("event");
  const section = useSelectedLayoutSegment() || "description";

  return (
    <Tabs value={section} className="w-full min-h-[300px]">
      <TabsList className="flex w-full bg-transparent p-0 m-0 overflow-auto justify-start">
        <Link href={`/event/${eventId}`} scroll={false}>
          <TabsTrigger
            value="description"
            className="w-fit p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
          >
            {t("about-event")}
          </TabsTrigger>
        </Link>
        <Link href={`/event/${eventId}/feed`} scroll={false}>
          <TabsTrigger
            value="feed"
            className="w-fit p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
          >
            {t("discussion")}
          </TabsTrigger>
        </Link>
        <Link href={`/event/${eventId}/votes`} scroll={false}>
          <TabsTrigger
            value="votes"
            className="w-fit p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
          >
            {t("votes")}
          </TabsTrigger>
        </Link>
      </TabsList>
      <Separator className="mb-3" />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-6 min-h-0 pt-4">
          <MainEventSectionsContent
            eventId={eventId}
            section={section as unknown as EventInfoTabsSchemaType}
          >
            {children}
          </MainEventSectionsContent>
        </div>
      </div>
    </Tabs>
  );
}

function MainEventSectionsContent({
  eventId,
  section,
  children,
}: {
  eventId: string;
  section: EventInfoTabsSchemaType;
  children?: React.ReactNode;
}) {
  const { getToken, userId } = useAuth();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const userRealmId = userInfo?.realmId || "";

  const { data: roles } = useSuspenseQuery(
    eventUserRoles(eventId, userRealmId),
  );

  const isOrganizer = useMemo(() => roles.includes("organizer"), [roles]);
  const isParticipant = useMemo(() => roles.includes("participant"), [roles]);
  const isMember = useMemo(
    () => isOrganizer || isParticipant,
    [isOrganizer, isParticipant],
  );
  const form = useForm<SocialFeedPostFormSchemaType>({
    mode: "all",
    resolver: zodResolver(socialFeedPostFormSchema),
    defaultValues: {
      content: "",
      question: "",
      options: [{ text: "" }, { text: "" }],
      allowMultipleOptions: false,
      duration: {
        days: 1,
        hours: 0,
        minutes: 0,
      },
    },
  });

  return (
    <>
      {section !== "description" && isMember && (
        <SocialFeedForm orgId={eventId} orgType="event" form={form} />
      )}
      <TabsContent value={section}>{children}</TabsContent>
    </>
  );
}
