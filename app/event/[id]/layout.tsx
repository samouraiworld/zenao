import { Metadata } from "next";
import { notFound } from "next/navigation";
import { eventOptions } from "@/lib/queries/event";
import { getQueryClient } from "@/lib/get-query-client";
import { web2URL } from "@/lib/uris";

type Props = {
  params: Promise<{ id: string }>;
  children?: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = (await params).id;

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

export default async function EventLayout({ children }: Props) {
  return <>{children}</>;
}
