"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { Loader2 } from "lucide-react";
import { Separator } from "@/components/shadcn/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/shadcn/tabs";
import { ProfileTabsSchemaType } from "@/types/schemas";
import ProfileEvents from "@/app/(general)/profile/[id]/[tab]/events";
import ProfilePortfolio from "@/app/(general)/profile/[id]/[tab]/portfolio";
import { PostCardSkeleton } from "@/components/social-feed/cards/post-card-skeleton";

type ProfileMainSectionsProps = {
  userId: string;
  section: ProfileTabsSchemaType;
  now: number;
};

function ProfileMainSections({
  userId,
  section,
  now,
}: ProfileMainSectionsProps) {
  console.log("asfausaiuazazassioajsa");

  const t = useTranslations("profile-info");

  return (
    <Tabs value={section} className="w-full">
      <TabsList className="flex w-full bg-transparent p-0 m-0 overflow-auto justify-start">
        <Link href={`/profile/${userId}`}>
          <TabsTrigger
            value="events"
            className="w-fit p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
          >
            {t("events")}
          </TabsTrigger>
        </Link>
        <Link href={`/profile/${userId}/portfolio`}>
          <TabsTrigger
            value="portfolio"
            className="w-fit p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
          >
            {t("portfolio")}
          </TabsTrigger>
        </Link>
      </TabsList>

      <Separator className="mb-3" />

      <div className="flex flex-col gap-6 min-h-0 pt-4">
        <TabsContent value="events">
          <Suspense fallback={<PostCardSkeleton />}>
            <ProfileEvents userId={userId} now={now} />
          </Suspense>
        </TabsContent>
        <TabsContent value="portfolio">
          <Suspense fallback={<Loader2 className="animate-spin" />}>
            <ProfilePortfolio userId={userId} />
          </Suspense>
        </TabsContent>
      </div>
    </Tabs>
  );
}
export default ProfileMainSections;
