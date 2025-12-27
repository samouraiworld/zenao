import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createPublicClient, http } from "viem";
import { EventInfoLayout } from "./event-info-layout";
import { EventScreenContainer } from "@/components/features/event/event-screen-container";
import { getQueryClient } from "@/lib/get-query-client";
import { eventOptions } from "@/lib/queries/event";
import { web2URL } from "@/lib/uris";
import { ticketMasterABI, ticketMasterAddress } from "@/lib/evm";

type Props = {
  params: Promise<{ id: string }>;
  children?: React.ReactNode;
};

export default async function EventLayout({ params, children }: Props) {
  const { id } = await params;

  const queryClient = getQueryClient();
  const evmClient = createPublicClient({
    transport: http(process.env.NEXT_PUBLIC_EVM_RPC),
  });

  let data;

  try {
    data = await queryClient.fetchQuery(eventOptions(id));
  } catch {
    notFound();
  }

  const rolesModAddr = await evmClient.readContract({
    abi: ticketMasterABI,
    address: ticketMasterAddress,
    functionName: "roles_mod",
    args: [id as `0x${string}`],
  });

  return (
    <EventScreenContainer id={id}>
      <div className="flex flex-col gap-8">
        <EventInfoLayout eventId={id} data={data} rolesModAddr={rolesModAddr} />
        <div>{children}</div>
      </div>
    </EventScreenContainer>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  let event;

  try {
    const queryClient = getQueryClient();
    event = await queryClient.fetchQuery(eventOptions(id));
    return {
      title: event.title,
      openGraph: {
        images: [{ url: web2URL(event.imageUri) }],
      },
    };
  } catch {
    notFound();
  }
}
