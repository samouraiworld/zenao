import {
  Control,
  FieldPathByValue,
  FieldValues,
  UseFormSetValue,
} from "react-hook-form";
import { z } from "zod";

interface GenericFormFieldProps<T extends FieldValues, TCondition> {
  control: Control<T>;
  name: FieldPathByValue<T, TCondition>;
  className?: string;
  placeholder?: string;
  setValue?: UseFormSetValue<EventFormSchemaType>;
}
export type FormFieldProps<
  T extends FieldValues,
  TCondition,
> = GenericFormFieldProps<T, TCondition>;

// Regular expression pattern to match a URL
export const urlPattern =
  /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
export const ipfsPattern = /^ipfs:\/\//;
const uriSchema = z.union([
  z.string().min(1).max(400).regex(urlPattern, "URL is not valid"),
  z.string().min(1).max(400).regex(ipfsPattern, "IPFS URI is not valid"),
]);

export const eventFormSchema = z.object({
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().min(10).max(10000),
  imageUri: uriSchema,
  startDate: z.coerce.bigint(),
  endDate: z.coerce.bigint(),
  location: z.string().trim().min(2).max(400),
  // TODO: re-enable it after mvp
  // ticketPrice: z.coerce.number(),
  capacity: z.coerce.number().min(1),
});
export type EventFormSchemaType = z.infer<typeof eventFormSchema>;

export const userFormSchema = z.object({
  bio: z.string().trim().min(2).max(1000),
  displayName: z.string().trim().min(1),
  avatarUri: uriSchema,
});
export type UserFormSchemaType = z.infer<typeof userFormSchema>;

const pollAnswerFormSchema = z.object({
  text: z.string().trim().min(1, "Required").max(55),
});

export const pollFormSchema = z.object({
  question: z.string().trim().min(1, "Required").max(300),
  answers: z.array(pollAnswerFormSchema).min(1).max(10),
  multipleAnswers: z.boolean(),
  endDate: z.coerce.bigint(),
});
export type PollFormSchemaType = z.infer<typeof pollFormSchema>;
