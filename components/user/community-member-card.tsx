import { UserAvatar } from "../features/user/user";
import { Badge } from "../shadcn/badge";
import { Card } from "../widgets/cards/card";
import Text from "../widgets/texts/text";

type CommunityMemberCardProps = {
  address: string;
  avatarUri: string;
  displayName: string;
  description?: string | null;
  roles: string[];
};

function CommunityMemberCard({
  address,
  avatarUri,
  displayName,
  description,
  roles,
}: CommunityMemberCardProps) {
  return (
    <Card className="flex items-center gap-6 p-6 md:max-w-[600px] bg-secondary/50 hover:bg-secondary/100 transition rounded-xl">
      <UserAvatar address={avatarUri} className="w-24 h-24 rounded-full" />

      <div className="flex flex-col justify-between flex-1 gap-3">
        <div>
          <Text size="sm" className="font-bold text-primary">{displayName}</Text>
          <Text size="xs" className="text-secondary-color">{address.substring(0, 10)}</Text>
          <Text size="xs" className="text-secondary-color mt-1">
            {description ?? "No description yet"}
          </Text>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <Text size="sm" className="font-semibold text-primary">Roles:</Text>
          <div className="flex gap-2 flex-wrap">
            {roles.map((role) => (
              <Badge key={role} variant="outline" className="text-sm px-3 py-1">
                {role}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default CommunityMemberCard;