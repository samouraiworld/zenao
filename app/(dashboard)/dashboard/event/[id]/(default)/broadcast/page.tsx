interface DashboardEventBroadcastPageProps {
  params: Promise<{ id: string }>;
}

export default function DashboardEventBroadcastPage({
  params: _,
}: DashboardEventBroadcastPageProps) {
  return <div>Broadcast Page</div>;
}
