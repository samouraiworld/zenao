"use client";

import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  Carousel,
  CarouselContent,
  CarouselDot,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/shadcn/carousel";
import Heading from "@/components/widgets/texts/heading";
import { makeLocationFromEvent } from "@/lib/location";
import { eventOptions } from "@/lib/queries/event";
import { eventTickets } from "@/lib/queries/ticket";
import { TicketCard } from "@/components/features/ticket/ticket-card";
import { useLayoutTimezone } from "@/hooks/use-layout-timezone";
import { locationTimezone } from "@/lib/event-location";

type TicketsInfoProps = {
  id: string;
};

export function TicketsInfo({ id }: TicketsInfoProps) {
  const { getToken } = useAuth();
  const { data: event } = useSuspenseQuery(eventOptions(id));
  const { data: tickets } = useSuspenseQuery(eventTickets(id, getToken));

  const location = makeLocationFromEvent(event.location);
  const eventTimezone = locationTimezone(location);
  const timezone = useLayoutTimezone(eventTimezone);

  const t = useTranslations("tickets");

  if (tickets.ticketsInfo.length === 0) {
    <div>
      <p>{t("no-tickets-event")}</p>
    </div>;
  }

  return (
    <div>
      <Carousel>
        <CarouselContent>
          {tickets.ticketsInfo.map((ticketInfo, index) => (
            <CarouselItem key={index}>
              <div className="flex flex-col gap-2">
                <Heading level={2}>Ticket #{index + 1}</Heading>
                <TicketCard
                  eventId={id}
                  event={event}
                  timezone={timezone}
                  ticketInfo={ticketInfo}
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="max-md:hidden" />
        <CarouselNext className="max-md:hidden" />
        <CarouselDot />
      </Carousel>
    </div>
  );
}
