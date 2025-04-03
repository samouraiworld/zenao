import HeaderEventsList from "../widgets/header-events-list";
import { FromFilter } from "@/lib/searchParams";

export const EventsListLayout: React.FC<{
  from: FromFilter;
  title: string;
  description?: string;
  children: React.ReactNode | React.ReactNode[];
}> = ({ from, title, description, children }) => {
  return (
    <div>
      <HeaderEventsList from={from} description={description} title={title} />
      {children}
    </div>
  );
};
