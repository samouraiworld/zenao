interface DashboardEventInfoLayoutProps {
  info?: React.ReactNode;
}

export default function DashboardEventInfoLayoutProps({
  info,
}: DashboardEventInfoLayoutProps) {
  return (
    <div className="flex flex-col gap-8">
      <div>{info}</div>
    </div>
  );
}
