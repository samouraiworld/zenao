import { Control, FieldValues } from "react-hook-form";
import { FormSchemaType } from "./CreateEventForm";
import { KeysOfValue } from "@/app/types";

interface GenericFormFieldProps<T extends FieldValues, TCondition> {
  control: Control<T>;
  name: KeysOfValue<T, TCondition>;
}
export type FormFieldProps<TCondition> = GenericFormFieldProps<
  FormSchemaType,
  TCondition
>;
