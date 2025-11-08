import React from "react";
import { notFound } from "next/navigation";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { ExclusiveEventGuard } from "./event-exclusive-guard";
import { imageHeight, imageWidth } from "./constants";
import { ScreenContainer } from "@/components/layout/screen-container";
import { getQueryClient } from "@/lib/get-query-client";
import { eventOptions } from "@/lib/queries/event";

type Props = {
  params: Promise<{ id: string }>;
  info?: React.ReactNode;
  tabs?: React.ReactNode;
};

export default async function EventLayout({ info, tabs, params }: Props) {
  const p = await params;
  const queryClient = getQueryClient();

  let data;
  try {
    data = await queryClient.fetchQuery(eventOptions(p.id));
  } catch (err) {
    console.error("error", err);
    notFound();
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ExclusiveEventGuard
        eventId={p.id}
        title={data.title}
        imageUri={data.imageUri}
        exclusive={data.privacy?.eventPrivacy.case === "guarded"}
      >
        <ScreenContainer
          background={{
            src: data.imageUri,
            width: imageWidth,
            height: imageHeight,
          }}
        >
          <div className="flex flex-col gap-8">
            <div>{info}</div>
            <div>{tabs}</div>
          </div>
        </ScreenContainer>
      </ExclusiveEventGuard>
    </HydrationBoundary>
  );
}
