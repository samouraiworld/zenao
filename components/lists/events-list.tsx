"use client";

import { CalendarIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { EventCard } from "../cards/event-card";
import { Button } from "../shadcn/button";
import { SmallText } from "../texts/small-text";
import { Text } from "../texts/default-text";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";

function EmptyEventsList() {
  const t = useTranslations("events-list");
  return (
    <div className="flex flex-col items-center gap-5 mt-10">
      <CalendarIcon
        strokeWidth={0.5}
        width={140}
        height={140}
        className="text-secondary-color"
      />
      <div className="text-center">
        <Text className="font-bold">{t("no-events")}</Text>
        <SmallText variant="secondary">{t("no-events-desc")}</SmallText>
      </div>
      <Button variant="secondary">
        <Link href="/create">
          <SmallText variant="secondary">{t("create-event")}</SmallText>
        </Link>
      </Button>
    </div>
  );
}

export function EventsList({ list }: { list: EventInfo[] }) {
  return (
    <div className="my-5">
      {!list.length ? (
        <EmptyEventsList />
      ) : (
        list.map((evt) => <EventCard key={evt.pkgPath} evt={evt} />)
      )}
    </div>
  );
}
