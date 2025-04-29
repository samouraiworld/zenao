"use client";

import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { eventOptions } from "@/lib/queries/event";
import { userAddressOptions } from "@/lib/queries/user";
import { makeLocationFromEvent } from "@/lib/location";
import { useLocationTimezone } from "@/app/hooks/use-location-timezone";
import { eventTickets } from "@/lib/queries/ticket";
import { TicketCard } from "@/components/cards/ticket-card";
import Heading from "@/components/texts/heading";
import {
  Carousel,
  CarouselContent,
  CarouselDot,
  CarouselItem,
} from "@/components/shadcn/carousel";
import { useMediaQuery } from "@/app/hooks/use-media-query";

type TicketsInfoProps = {
  id: string;
};

export function TicketsInfo({ id }: TicketsInfoProps) {
  const { getToken, userId } = useAuth();
  const { data: event } = useSuspenseQuery(eventOptions(id));
  const { data: _address } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { data: tickets } = useSuspenseQuery(eventTickets(id, getToken));

  useEffect(() => {
    tickets.ticketsSecrets.push("Another one");
  }, [tickets]);

  const location = makeLocationFromEvent(event.location);
  const timezone = useLocationTimezone(location);

  if (isDesktop) {
    return (
      <div className="max-md:hidden flex flex-col gap-6 pb-12">
        {tickets.ticketsSecrets.map((ticketSecret, index) => (
          <div key={index} className="flex flex-col gap-2">
            <Heading level={2}>Ticket #{index + 1}</Heading>
            <TicketCard
              eventId={id}
              event={event}
              timezone={timezone}
              ticketSecret={ticketSecret}
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
          {tickets.ticketsSecrets.map((ticketSecret, index) => (
            <CarouselItem key={index}>
              <div className="flex flex-col gap-2">
                <Heading level={2}>Ticket #{index + 1}</Heading>
                <TicketCard
                  eventId={id}
                  event={event}
                  timezone={timezone}
                  ticketSecret={ticketSecret}
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
