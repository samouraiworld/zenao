import HeaderEventsList from "../widgets/header-events-list";

export const EventsListLayout: React.FC<{
  // upcoming: EventInfo[];
  // past: EventInfo[];
  title: string;
  description?: string;
  children: React.ReactNode | React.ReactNode[];
}> = ({ title, description, children }) => {
  return (
    <div>
      <HeaderEventsList description={description} title={title} />
      {children}
      {/* {tab === "upcoming" ? (
        <EventsList list={upcoming} />
      ) : (
        <EventsList list={past} />
      )} */}
    </div>
  );
};
