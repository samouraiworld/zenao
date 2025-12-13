"use client";

import {
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useAccount } from "wagmi";
import { useMemo } from "react";
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
import { TicketCard } from "@/components/features/ticket/ticket-card";
import { useLayoutTimezone } from "@/hooks/use-layout-timezone";
import { locationTimezone } from "@/lib/event-location";
import { ticketsByOwner } from "@/lib/queries/events-list";

type TicketsInfoProps = {
  id: string;
};

export function TicketsInfo({ id }: TicketsInfoProps) {
  const { address } = useAccount();
  const { data: event } = useSuspenseQuery(eventOptions(id));
  const { data: ticketsPages } = useSuspenseInfiniteQuery(
    ticketsByOwner(address || "", 200, id),
  );

  const location = makeLocationFromEvent(event.location);
  const eventTimezone = locationTimezone(location);
  const timezone = useLayoutTimezone(eventTimezone);

  const tickets = useMemo(() => {
    return ticketsPages.pages.reduce((acc, page) => {
      return [...acc, ...page];
    });
  }, [ticketsPages.pages]);

  const t = useTranslations("tickets");

  if (tickets.length === 0) {
    <div>
      <p>{t("no-tickets-event")}</p>
    </div>;
  }

  return (
    <div>
      <Carousel>
        <CarouselContent>
          {tickets.map((ticket) => (
            <CarouselItem key={ticket.ticketPubKey}>
              <div className="flex flex-col gap-2">
                <Heading level={2}>
                  Ticket #{ticket.ticketPubKey.toString()}
                </Heading>
                <TicketCard
                  eventId={id}
                  event={event}
                  timezone={timezone}
                  ticketInfo={ticket}
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
