import { UserAvatar } from "../features/user/user";
import { Badge } from "../shadcn/badge";
import { Card } from "../widgets/cards/card";
import Text from "../widgets/texts/text";
import { deserializeWithFrontMatter } from "@/lib/serialization";
import { gnoProfileDetailsSchema } from "@/types/schemas";

type CommunityMemberCardProps = {
  address: string;
  displayName: string;
  bio: string;
  roles: string[];
};

function CommunityMemberCard({
  address,
  displayName,
  bio,
  roles,
}: CommunityMemberCardProps) {
  const { shortBio } = deserializeWithFrontMatter({
    serialized: bio,
    schema: gnoProfileDetailsSchema,
    defaultValue: {
      bio: "",
      socialMediaLinks: [],
      location: "",
      shortBio: "",
      bannerUri: "",
      skills: [],
      experiences: [],
    },
    contentFieldName: "bio",
  });

  const shortBioCut =
    shortBio.length > 100 ? shortBio.substring(0, 100) + "..." : shortBio;

  return (
    <Card className="flex items-center gap-6 p-6 md:max-w-[600px] bg-secondary/50 hover:bg-secondary/100 transition rounded-xl">
      <UserAvatar
        realmId={address}
        className="w-24 h-24 rounded-full"
        size="lg"
      />

      <div className="flex flex-col justify-between flex-1 gap-3">
        <div>
          <Text size="sm" className="font-bold text-primary">
            {displayName}
          </Text>
          <Text size="xs" className="text-secondary-color">
            {address.substring(0, 10)}
          </Text>
        </div>
        {shortBioCut && (
          <Text size="xs" className="text-secondary-color">
            {shortBioCut}
          </Text>
        )}
        <div className="flex gap-2 flex-wrap">
          {roles.map((role) => (
            <Badge key={role} variant="outline" className="text-sm px-3 py-1">
              {role}
            </Badge>
          ))}
        </div>
      </div>
    </Card>
  );
}

export default CommunityMemberCard;
