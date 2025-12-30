import { useFormContext } from "react-hook-form";
import EventFormCommunitySelector from "@/components/features/event/event-form-community-selector";
import { EventFormSchemaType } from "@/types/schemas";

export default function DashboardFormCommunity() {
  const form = useFormContext<EventFormSchemaType>();

  return <EventFormCommunitySelector form={form} />;
}
