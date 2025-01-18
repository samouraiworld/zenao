import { Control, FieldValues } from "react-hook-form";
import { z } from "zod";
import { KeysOfValue } from "@/app/types";

interface GenericFormFieldProps<T extends FieldValues, TCondition> {
  control: Control<T>;
  name: KeysOfValue<T, TCondition>;
}
export type FormFieldProps<TCondition> = GenericFormFieldProps<
  EventFormSchemaType,
  TCondition
>;

export const eventFormSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  imageUri: z.string().trim().min(1).url(),
  startDate: z.coerce.bigint(),
  endDate: z.coerce.bigint(),
  ticketPrice: z.coerce.number(),
  capacity: z.coerce.number(),
});
export type EventFormSchemaType = z.infer<typeof eventFormSchema>;
