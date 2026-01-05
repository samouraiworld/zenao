import {
  Control,
  FieldPathByValue,
  FieldValues,
  UseFormSetValue,
} from "react-hook-form";
import { z } from "zod";
import { eventGetUserRolesSchema } from "@/lib/queries/event-users";

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

export const socialLinkSchema = z.object({
  url: z.string().url().max(400),
});

export type socialLinkSchemaType = z.infer<typeof socialLinkSchema>;

export const userExperienceSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Title is too short (3 characters min)")
      .max(100, "Title is too long (100 characters max)"),
    description: z
      .string()
      .trim()
      .min(3, "Description is too short (3 characters min)")
      .max(1000, "Description is too long (1000 characters max)"),
    start: z.object({
      month: z.coerce.number().min(1).max(12),
      year: z.coerce.number().min(1900).max(2200),
    }),
    end: z
      .object({
        month: z.coerce.number().int().min(1).max(12),
        year: z.coerce.number().int().min(1900).max(2200),
      })
      .optional(),
    current: z.boolean().default(false),
    organization: z
      .string()
      .trim()
      .max(100, "Organization name is too long (100 characters max)")
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.current && !data.end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date is required if not ongoing",
        path: ["end"],
      });
    }

    if (data.end) {
      const startDate = new Date(data.start.year, data.start.month - 1);
      const endDate = new Date(data.end.year, data.end.month - 1);

      if (endDate < startDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "End date cannot be before start date",
          path: ["end"],
        });
      }
    }
  });

export type UserExperienceSchemaType = z.infer<typeof userExperienceSchema>;
export const userFormSkillSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Skill cannot be empty")
    .max(20, "Skill name too long"),
});

export type UserFormSkillSchemaType = z.infer<typeof userFormSkillSchema>;

export const userFormSchema = z.object({
  bio: z.string().trim().max(1000).optional().default(""),
  displayName: z.string().trim().min(1),
  socialMediaLinks: z.array(socialLinkSchema),
  avatarUri: uriSchema,
  bannerUri: z.string().optional().default(""),
  location: z.string().trim().max(100).optional().default(""),
  shortBio: z.string().max(200).optional().default(""),
  experiences: z.array(userExperienceSchema).default([]),
  skills: z.array(userFormSkillSchema),
});
export type UserFormSchemaType = z.infer<typeof userFormSchema>;

export const profileDetailsSchema = z.object({
  bio: z.string().trim().max(1000).optional().default(""),
  socialMediaLinks: z.array(socialLinkSchema).default([]),
  location: z.string().trim().max(100).optional().default(""),
  shortBio: z.string().max(200).optional().default(""),
  bannerUri: z.string().optional().default(""),
  experiences: z.array(userExperienceSchema).default([]),
  skills: z.array(userFormSkillSchema).default([]),
});

export type ProfileDetails = z.infer<typeof profileDetailsSchema>;

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

export const socialFeedPostFormSchema = z
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
export type SocialFeedPostFormSchemaType = z.infer<
  typeof socialFeedPostFormSchema
>;

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
  z.literal("votes"),
  z.literal("events"),
  z.literal("members"),
  z.literal("portfolio"),
  z.literal("proposals"),
]);
export type CommunityTabsSchemaType = z.infer<typeof communityTabsSchema>;

export const communityFormSchema = z.object({
  displayName: z.string().min(2, "Name too short"),
  description: z.string().min(10, "Description too short"),
  avatarUri: z.string().url().or(z.literal("")),
  bannerUri: z.string().url().or(z.literal("")),
  shortDescription: z.string().max(200).optional().default(""),
  socialMediaLinks: z.array(socialLinkSchema).default([]),
  administrators: z
    .array(
      z.object({
        email: z.string().email("Administrator must be a valid email address"),
      }),
    )
    .min(1, "At least one admin is required"),
});

export type CommunityFormSchemaType = z.infer<typeof communityFormSchema>;

export const portfolioItemSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["image", "video", "audio"]),
  uploadedAt: z.coerce.date(),
  uri: uriSchema,
  name: z.string().min(1).max(100),
});

export type PortfolioItem = z.infer<typeof portfolioItemSchema>;

export const portfolioUploadVideoSchema = z
  .object({
    origin: z.union([z.literal("youtube"), z.literal("vimeo")]),
    uri: uriSchema,
  })
  .refine(
    (data) => {
      if (
        (data.origin === "youtube" &&
          !/^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]{11}(&.*)?$/.test(
            data.uri,
          ) &&
          !/^https?:\/\/youtu\.be\/[\w-]{11}(&.*)?$/.test(data.uri)) ||
        (data.origin === "vimeo" &&
          !/^https?:\/\/(www\.)?vimeo\.com\/\d+(&.*)?$/.test(data.uri))
      ) {
        return false;
      }
      return true;
    },
    { message: "Video URL is not valid", path: ["uri"] },
  );

export type PortfolioUploadVideoSchemaType = z.infer<
  typeof portfolioUploadVideoSchema
>;

export const communityDetailsSchema = z.object({
  shortDescription: z.string().max(200).optional().default(""),
  description: z.string().trim().max(1000).optional().default(""),
  portfolio: z.array(portfolioItemSchema).default([]),
  socialMediaLinks: z.array(socialLinkSchema).default([]),
});

export type CommunityDetails = z.infer<typeof communityDetailsSchema>;

export const broadcastEmailFormSchema = z.object({
  message: z
    .string()
    .min(30, "Message must be at least 30 characters")
    .max(5000, "Message must be at most 5000 characters"),
  attachTicket: z.boolean(),
});

export type BroadcastEmailFormSchema = z.infer<typeof broadcastEmailFormSchema>;

export const eventInfoPrivacySchema = z.object({
  eventPrivacy: z.union([
    z.object({
      case: z.literal("public"),
      value: z.object({}),
    }),
    z.object({
      case: z.literal("guarded"),
      value: z.object({
        participationPubkey: z.string(),
      }),
    }),
  ]),
});

export type SafeEventPrivacy = z.infer<typeof eventInfoPrivacySchema>;

export const eventInfoGeoAddress = z.object({
  case: z.literal("geo"),
  value: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string(),
    size: z.number(),
  }),
});

export type SafeEventGeoAddress = z.infer<typeof eventInfoGeoAddress>;

export const eventInfoVirtualAddress = z.object({
  case: z.literal("virtual"),
  value: z.object({
    uri: z.string().min(1).max(400),
  }),
});

export type SafeEventVirtualAddress = z.infer<typeof eventInfoVirtualAddress>;

export const eventInfoCustomAddress = z.object({
  case: z.literal("custom"),
  value: z.object({
    address: z.string().min(1),
    timezone: z.string().min(1),
  }),
});

export type SafeEventCustomAddress = z.infer<typeof eventInfoCustomAddress>;

export const eventInfoLocationSchema = z.object({
  venueName: z.string().max(200).optional().default(""),
  instructions: z.string().max(2000).optional().default(""),
  address: z.union([
    eventInfoGeoAddress,
    eventInfoVirtualAddress,
    eventInfoCustomAddress,
  ]),
});

export type SafeEventLocation = z.infer<typeof eventInfoLocationSchema>;

export const eventInfoSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  imageUri: z.string(),
  organizers: z.array(z.string()),
  gatekeepers: z.array(z.string()),
  startDate: z.bigint(),
  endDate: z.bigint(),
  capacity: z.number(),
  checkedIn: z.number(),
  participants: z.number(),
  location: eventInfoLocationSchema,
  privacy: eventInfoPrivacySchema.optional(),
  discoverable: z.boolean(),
});

export type SafeEventInfo = z.infer<typeof eventInfoSchema>;

export const eventUserSchema = z.object({
  event: eventInfoSchema,
  roles: eventGetUserRolesSchema,
});

export type SafeEventUser = z.infer<typeof eventUserSchema>;

const communityUserRolesEnum = z.enum(["administrator", "member", "event"]);

export type CommunityUserRole = z.infer<typeof communityUserRolesEnum>;

export const communityGetUserRolesSchema = z.array(communityUserRolesEnum);

export const communityInfoSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  description: z.string(),
  avatarUri: z.string(),
  bannerUri: z.string(),
  countMembers: z.number(),
  administrators: z.array(z.string()),
});

export type SafeCommunityInfo = z.infer<typeof communityInfoSchema>;

export const communityUserSchema = z.object({
  community: communityInfoSchema,
  roles: communityGetUserRolesSchema,
});

export type SafeCommunityUser = z.infer<typeof communityUserSchema>;
