import { auth } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import {
  Carousel,
  CarouselContent,
  CarouselDot,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/shadcn/carousel";
import Heading from "@/components/widgets/texts/heading";
import { eventOptions } from "@/lib/queries/event";
import { TicketCard } from "@/components/features/ticket/ticket-card";
import { eventTickets } from "@/lib/queries/ticket";
import { getQueryClient } from "@/lib/get-query-client";

type TicketsInfoProps = {
  id: string;
};

export async function TicketsInfo({ id }: TicketsInfoProps) {
  const { getToken } = await auth();

  const queryClient = getQueryClient();

  const event = await queryClient.fetchQuery(eventOptions(id));

  const ticketsInfo = await queryClient.fetchQuery(eventTickets(id, getToken));

  const t = await getTranslations("tickets");

  if (ticketsInfo?.ticketsInfo.length === 0) {
    <div>
      <p>{t("no-tickets-event")}</p>
    </div>;
  }

  return (
    <div>
      <Carousel>
        <CarouselContent>
          {ticketsInfo?.ticketsInfo.map((ticketInfo, index) => (
            <CarouselItem key={index}>
              <div className="flex flex-col gap-2">
                <Heading level={2}>Ticket #{index + 1}</Heading>
                <TicketCard
                  eventId={id}
                  event={event}
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
