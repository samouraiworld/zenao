import matter from "gray-matter";
import { GnoProfileDetails, gnoProfileDetailsSchema } from "@/types/schemas";

export function serializeUserProfileDetails(
  profileDetails: GnoProfileDetails,
): string {
  const { bio, socialMediaLinks } = profileDetails;

  // header containing structured data
  const header = { socialMediaLinks };

  return matter.stringify(bio, header);
}

export function deserializeUserProfileDetails(
  serializedProfileDetails: string,
): GnoProfileDetails {
  const { content, data } = matter(serializedProfileDetails);

  // Ensure that header are valid
  const result = gnoProfileDetailsSchema.safeParse({ bio: content, ...data });

  if (!result.success) {
    // If the header is invalid, return a default profile
    return {
      bio: content,
      socialMediaLinks: {},
    };
  }

  return {
    bio: result.data.bio,
    socialMediaLinks: result.data.socialMediaLinks,
  };
}
