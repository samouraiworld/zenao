import { Metadata } from "next";
import { notFound } from "next/navigation";
import { eventOptions } from "@/lib/queries/event";
import { getQueryClient } from "@/lib/get-query-client";
import { web2URL } from "@/lib/uris";
import { ScreenContainer } from "@/components/layout/screen-container";

type Props = {
  params: Promise<{ id: string }>;
  info?: React.ReactNode;
  tabs?: React.ReactNode;
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

export default async function EventLayout({ info, tabs }: Props) {
  return (
    <ScreenContainer>
      <div className="flex flex-col gap-8">
        <div>{info}</div>
        <div>{tabs}</div>
      </div>
    </ScreenContainer>
  );
}
