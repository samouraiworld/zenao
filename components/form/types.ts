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
export const virtualLocationSchema = z.object({
  kind: z.literal("virtual"),
  location: z
    .string()
    .trim()
    .min(1)
    .max(400)
    .regex(urlPattern, "URL is not valid"),
});
const customLocationSchema = z.object({
  kind: z.literal("custom"),
  address: z.string().trim().min(1),
  timeZone: z.string().trim().min(1),
});

export const addressLocationSchema = z.object({
  kind: z.literal("geo"),
  address: z.string().trim().min(1),
  lat: z.number(),
  lng: z.number(),
  size: z.number(),
});
const locationSchema = z
  .union([virtualLocationSchema, customLocationSchema, addressLocationSchema])
  .superRefine((data, ctx) => {
    if (
      (data.kind === "virtual" &&
        !virtualLocationSchema.safeParse(data).success) ||
      (data.kind === "custom" &&
        !customLocationSchema.safeParse(data).success) ||
      (data.kind === "geo" && !addressLocationSchema.safeParse(data).success)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Valid location required",
        path: [],
      });
    }
  });

const uriSchema = z.union([
  z
    .string()
    .min(1, "An image is required")
    .max(400)
    .regex(urlPattern, "URL is not valid"),
  z
    .string()
    .min(1, "An image is required")
    .max(400)
    .regex(ipfsPattern, "IPFS URI is not valid"),
]);

export const eventFormSchema = z.object({
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().min(10).max(10000),
  imageUri: uriSchema,
  startDate: z.coerce.bigint(),
  endDate: z.coerce.bigint(),
  location: locationSchema,
  // TODO: re-enable it after mvp
  // ticketPrice: z.coerce.number(),
  capacity: z.coerce.number().min(1),
  exclusive: z.boolean(),
  password: z.string().optional(),
});
export type EventFormSchemaType = z.infer<typeof eventFormSchema>;

export const userFormSchema = z.object({
  bio: z.string().trim().min(2).max(1000),
  displayName: z.string().trim().min(1),
  avatarUri: uriSchema,
});
export type UserFormSchemaType = z.infer<typeof userFormSchema>;

const pollOptionFormSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Required")
    .max(128, "Option must be at most 128 characters long"),
});

const pollDurationFormSchema = z.object({
  days: z.coerce.number().min(0).max(7),
  minutes: z.coerce.number().min(0).max(59),
  hours: z.coerce.number().min(0).max(23),
});

const parentPostSchema = z.object({
  kind: z.union([z.literal("POLL"), z.literal("STANDARD_POST")]),
  author: z.string(),
  postId: z.bigint(),
});
export type ParentPostSchemaType = z.infer<typeof parentPostSchema>;

export const standardPostFormSchema = z.object({
  kind: z.literal("STANDARD_POST"),
  parentPost: parentPostSchema.optional(),
  content: z.string().trim().min(1, "Required").max(5000),
});
export type StandardPostFormSchemaType = z.infer<typeof standardPostFormSchema>;

export const pollFormSchema = z.object({
  parentPost: parentPostSchema.optional(),
  kind: z.literal("POLL"),
  question: z.string().trim().min(1, "Required").max(300),
  options: z.array(pollOptionFormSchema).min(2).max(8),
  allowMultipleOptions: z.boolean(),
  duration: pollDurationFormSchema,
});
export type PollFormSchemaType = z.infer<typeof pollFormSchema>;

export const feedPostFormSchema = z
  .union([standardPostFormSchema, pollFormSchema])
  .refine(
    (data) => {
      if (
        (data.kind === "POLL" && !pollFormSchema.safeParse(data).success) ||
        (data.kind === "STANDARD_POST" &&
          !standardPostFormSchema.safeParse(data).success)
      ) {
        return false;
      }
      return true;
    },
    { params: [] },
  );
export type FeedPostFormSchemaType = z.infer<typeof feedPostFormSchema>;

export const eventProtectionFormSchema = z.object({
  password: z
    .string()
    .min(1, "Required")
    .max(128, "Password must be at most 128 characters"),
});
export type EventProtectionFormSchemaType = z.infer<
  typeof eventProtectionFormSchema
>;

export const eventInfoTabsSchema = z
  .union([z.literal("description"), z.literal("feed"), z.literal("votes")])
  .default("description");
export type EventInfoTabsSchemaType = z.infer<typeof eventInfoTabsSchema>;
