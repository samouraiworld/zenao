interface DashboardEventInfoLayoutProps {
  info?: React.ReactNode;
  tabs?: React.ReactNode;
}

export default function DashboardEventInfoLayoutProps({
  info,
  tabs,
}: DashboardEventInfoLayoutProps) {
  return (
    <div className="flex flex-col gap-8">
      <div>{info}</div>
      <div>{tabs}</div>
    </div>
  );
}
