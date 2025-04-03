import { EventCard } from "../cards/event-card";
import EmptyEventsList from "./empty-events-list";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";

export const EventsList: React.FC<{
  list: EventInfo[];
}> = ({ list }) => {
  return (
    <div className="my-5">
      {!list.length ? (
        <EmptyEventsList />
      ) : (
        list.map((evt) => <EventCard key={evt.pkgPath} evt={evt} />)
      )}
    </div>
  );
};
