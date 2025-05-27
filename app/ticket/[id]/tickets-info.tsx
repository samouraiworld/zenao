"use client";

import { useLocationTimezone } from "@/app/hooks/use-location-timezone";
import { useMediaQuery } from "@/app/hooks/use-media-query";
import { TicketCard } from "@/components/cards/ticket-card";
import {
  Carousel,
  CarouselContent,
  CarouselDot,
  CarouselItem,
} from "@/components/shadcn/carousel";
import Heading from "@/components/texts/heading";
import { makeLocationFromEvent } from "@/lib/location";
import { eventOptions } from "@/lib/queries/event";
import { eventTickets } from "@/lib/queries/ticket";
import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

type TicketsInfoProps = {
  id: string;
};

export function TicketsInfo({ id }: TicketsInfoProps) {
  const { getToken } = useAuth();
  const { data: event } = useSuspenseQuery(eventOptions(id));
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { data: tickets } = useSuspenseQuery(eventTickets(id, getToken));

  const location = makeLocationFromEvent(event.location);
  const timezone = useLocationTimezone(location);

  const t = useTranslations("tickets");

  if (tickets.ticketsInfo.length === 0) {
    <div>
      <p>{t("no-tickets-event")}</p>
    </div>;
  }

  if (isDesktop) {
    return (
      <div className="max-md:hidden flex flex-col gap-6 pb-12">
        {tickets.ticketsInfo.map((ticketInfo, index) => (
          <div key={index} className="flex flex-col gap-2">
            <Heading level={2}>Ticket #{index + 1}</Heading>
            <TicketCard
              eventId={id}
              event={event}
              timezone={timezone}
              ticketSecret={ticketInfo.ticketSecret}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="md:hidden">
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
                  ticketSecret={ticketInfo.ticketSecret}
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselDot />
      </Carousel>
    </div>
  );
}
