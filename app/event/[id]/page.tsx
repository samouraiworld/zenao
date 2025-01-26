import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Metadata } from "next";
import { GnoJSONRPCProvider } from "@gnolang/gno-js-client";
import { EventInfo } from "./event-info";
import {
  eventInfoSchema,
  eventOptions,
  extractGnoJSONResponse,
} from "@/lib/queries/event";
import { getQueryClient } from "@/lib/get-query-client";
import { ScreenContainer } from "@/components/layout/ScreenContainer";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = (await params).id;

  // I have to reproduce the eventOptions query because i can't use hook here
  const client = new GnoJSONRPCProvider(
    process.env.NEXT_PUBLIC_ZENAO_GNO_ENDPOINT || "",
  );
  const res = await client.evaluateExpression(
    `gno.land/r/zenao/events/e${id}`,
    `event.GetInfoJSON()`,
  );
  const event = eventInfoSchema.parse(extractGnoJSONResponse(res));

  return {
    title: event.title,
    openGraph: {
      images: [{ url: event.imageUri }],
    },
  };
}

export default async function EventPage({ params }: Props) {
  const p = await params;
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(eventOptions(p.id));

  return (
    <ScreenContainer>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <EventInfo id={p.id} />
      </HydrationBoundary>
    </ScreenContainer>
  );
}
