import { Control, FieldValues, UseFormSetValue } from "react-hook-form";
import { z } from "zod";
import { KeysOfValue } from "@/app/types";

interface GenericFormFieldProps<T extends FieldValues, TCondition> {
  control: Control<T>;
  name: KeysOfValue<T, TCondition>;
  className?: string;
  placeholder?: string;
  setValue?: UseFormSetValue<EventFormSchemaType>;
}
export type FormFieldProps<TCondition> = GenericFormFieldProps<
  EventFormSchemaType,
  TCondition
>;

// Regular expression pattern to match a URL
export const urlPattern =
  /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
export const eventFormSchema = z.object({
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().min(10).max(10000),
  imageUri: z.string().min(1).max(400).regex(urlPattern, "URL is not valid"),
  startDate: z.coerce.bigint(),
  endDate: z.coerce.bigint(),
  location: z.string().trim().min(2).max(400),
  // TODO: re-enable it after mvp
  // ticketPrice: z.coerce.number(),
  capacity: z.coerce.number().min(1),
});
export type EventFormSchemaType = z.infer<typeof eventFormSchema>;
