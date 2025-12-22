interface DashboardEventGatekeepersPageProps {
  params: Promise<{ id: string }>;
}

export default function DashboardEventGatekeepersPage({
  params: _,
}: DashboardEventGatekeepersPageProps) {
  return <div>Gatekeepers Page</div>;
}
