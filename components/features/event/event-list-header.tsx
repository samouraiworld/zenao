import Heading from "../../widgets/texts/heading";
import Text from "../../widgets/texts/text";
import { GnowebButton } from "../../widgets/buttons/gnoweb-button";
import EventFromFilterTab from "./event-from-filter-tab";
import { FromFilter } from "@/lib/search-params";

const HeaderEventsList: React.FC<{
  from: FromFilter;
  title: string;
  description?: string;
  tabLinks: { upcoming: string; past: string };
}> = ({ from, title, description, tabLinks }) => {
  return (
    <div className="flex flex-col gap-2 mb-3">
      <div className="flex flex-col gap-2 md:gap-0 md:flex-row md:justify-between md:items-center">
        <div className="flex flex-col md:flex-row gap-2 md:items-center">
          <Heading level={1} size="4xl" className="truncate">
            {title}
          </Heading>
          <GnowebButton
            href={`${process.env.NEXT_PUBLIC_GNOWEB_URL}/r/zenao/eventreg`}
          />
        </div>
        <div>
          <EventFromFilterTab from={from} tabLinks={tabLinks} />
        </div>
      </div>

      {description && (
        <Text variant="secondary" className="line-clamp-2">
          {description}
        </Text>
      )}
    </div>
  );
};

export default HeaderEventsList;
