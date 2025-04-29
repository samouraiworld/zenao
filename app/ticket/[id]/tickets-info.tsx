"use client";

import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { eventOptions } from "@/lib/queries/event";
import { userAddressOptions } from "@/lib/queries/user";
import { makeLocationFromEvent } from "@/lib/location";
import { useLocationTimezone } from "@/app/hooks/use-location-timezone";
import { eventTickets } from "@/lib/queries/ticket";
import { TicketCard } from "@/components/cards/ticket-card";
import Heading from "@/components/texts/heading";

type TicketsInfoProps = {
  id: string;
};

export function TicketsInfo({ id }: TicketsInfoProps) {
  const { getToken, userId } = useAuth();
  const { data: event } = useSuspenseQuery(eventOptions(id));
  const { data: _address } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const { data: tickets } = useSuspenseQuery(eventTickets(id, getToken));

  const location = makeLocationFromEvent(event.location);
  const timezone = useLocationTimezone(location);

  return (
    <div>
      {tickets.ticketsSecrets.map((ticketSecret, index) => (
        <div key={index} className="flex flex-col gap-2">
          <Heading>Ticket #{index + 1}</Heading>
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
