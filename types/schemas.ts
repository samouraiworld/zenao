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

export const emailSchema = z.object({
  email: z.string().email(),
});
export type EmailSchemaType = z.infer<typeof emailSchema>;

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
  gatekeepers: z.array(emailSchema),
  communityId: z.string().nullable(),
  discoverable: z.boolean(),
});
export type EventFormSchemaType = z.infer<typeof eventFormSchema>;

export const userFormSocialLinkSchema = z.object({
  url: z.string().url().max(400),
});

export type UserFormSocialLinkSchemaType = z.infer<
  typeof userFormSocialLinkSchema
>;

export const userFormSchema = z.object({
  bio: z.string().trim().min(2).max(1000),
  displayName: z.string().trim().min(1),
  socialMediaLinks: z.array(userFormSocialLinkSchema),
  avatarUri: uriSchema,
  location: z.string().trim().max(100).optional().default(""),
});
export type UserFormSchemaType = z.infer<typeof userFormSchema>;

export const gnoProfileDetailsSchema = z.object({
  bio: z.string().trim().min(2).max(1000),
  socialMediaLinks: z.array(userFormSocialLinkSchema),
  location: z.string().trim().max(100).optional().default(""),
});

export type GnoProfileDetails = z.infer<typeof gnoProfileDetailsSchema>;

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

export const standardPostFormSchema = z.object({
  kind: z.literal("STANDARD_POST"),
  parentPostId: z.bigint().optional(),
  content: z.string().trim().min(1, "You must enter something").max(5000),
});
export type StandardPostFormSchemaType = z.infer<typeof standardPostFormSchema>;

export const pollFormSchema = z.object({
  parentPostId: z.bigint().optional(),
  kind: z.literal("POLL"),
  question: z.string().trim().min(1, "You must enter a question").max(300),
  options: z
    .array(pollOptionFormSchema)
    .min(2, "There must be at least 2 options")
    .max(8, "There must be at most 8 options"),
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

export const communityTabsSchema = z.union([
  z.literal("chat"),
  z.literal("events"),
  z.literal("members"),
  z.literal("proposals"),
]);
export type CommunityTabsSchemaType = z.infer<typeof communityTabsSchema>;

export const communityFormSchema = z.object({
  displayName: z.string().min(2, "Name too short"),
  description: z.string().min(10, "Description too short"),
  avatarUri: z.string().url().or(z.literal("")),
  bannerUri: z.string().url().or(z.literal("")),
  administrators: z
    .array(z.object({address: z
.string()
    .email("Administrator must be a valid email address"),
      })
    )
    .min(1, "At least one admin is required"),
});

export type CommunityFormSchemaType = z.infer<typeof communityFormSchema>;
