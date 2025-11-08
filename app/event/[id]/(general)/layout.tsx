import React from "react";
import { EventScreenContainer } from "@/components/features/event/event-screen-container";

type Props = {
  params: Promise<{ id: string }>;
  info?: React.ReactNode;
  tabs?: React.ReactNode;
};

export default async function EventLayout({ info, tabs, params }: Props) {
  const p = await params;

  return (
    <EventScreenContainer id={p.id}>
      <div className="flex flex-col gap-8">
        <div>{info}</div>
        <div>{tabs}</div>
      </div>
    </EventScreenContainer>
  );
}
