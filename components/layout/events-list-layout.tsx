import HeaderEventsList from "../widgets/header-events-list";

export const EventsListLayout: React.FC<{
  title: string;
  description?: string;
  children: React.ReactNode | React.ReactNode[];
}> = ({ title, description, children }) => {
  return (
    <div>
      <HeaderEventsList description={description} title={title} />
      {children}
    </div>
  );
};
