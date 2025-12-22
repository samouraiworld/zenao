interface DashboardEventParticipantsPageProps {
  params: Promise<{ id: string }>;
}

export default function DashboardEventParticipantsPage({
  params: _,
}: DashboardEventParticipantsPageProps) {
  return <div>Participants Page</div>;
}
