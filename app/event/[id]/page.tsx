import { EventInfoLayout } from "./event-info-layout";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EventPage({ params }: Props) {
  const { id } = await params;
  return <EventInfoLayout eventId={id} />;
}
