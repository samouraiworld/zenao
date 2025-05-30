import HeaderEventsList from "../widgets/header-events-list";
import { FromFilter } from "@/lib/searchParams";

export const EventsListLayout: React.FC<{
  from: FromFilter;
  title: string;
  description?: string;
  children: React.ReactNode | React.ReactNode[];
  tabLinks: { upcoming: string; past: string };
}> = ({ from, title, description, tabLinks, children }) => {
  return (
    <div className="flex flex-col gap-8">
      <HeaderEventsList
        from={from}
        description={description}
        title={title}
        tabLinks={tabLinks}
      />
      {children}
    </div>
  );
};
