"use client";

import { useTranslations } from "next-intl";
import EmptyList from "@/components/widgets/lists/empty-list";
import Heading from "@/components/widgets/texts/heading";

type CommunityEventsProps = {
  communityId: string;
  now: number;
};

function CommunityEvents({ communityId: _, now: _now }: CommunityEventsProps) {
  const t = useTranslations();

  return (
    <div className="space-y-8">
      <Heading level={2} size="lg">
        Hosting events ({0})
      </Heading>

      <div className="flex flex-col gap-0">
        <EmptyList
          title={t("no-events-title")}
          description={t("no-events-description")}
        />
      </div>

      <Heading level={2} size="lg">
        Past events ({0})
      </Heading>

      <div className="flex flex-col gap-0">
        <EmptyList
          title={t("no-events-title")}
          description={t("no-events-description")}
        />
      </div>
    </div>
  );
}

export default CommunityEvents;
