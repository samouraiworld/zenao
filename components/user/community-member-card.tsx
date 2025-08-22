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
    <Card className="flex flex-col gap-2 md:max-w-[450px] bg-secondary/50 hover:bg-secondary/100">
      <UserAvatar address={avatarUri} className="w-[45px] h-[45px]" />
      <div className="flex flex-col gap-0">
        <Text size="sm">{displayName}</Text>
        <Text size="xs" className="text-secondary-color">
          {address.substring(0, 10)}
        </Text>
        <Text size="xs" className="text-secondary-color">
          {description ?? "No description yet"}
        </Text>
      </div>
      <div>
        <Text size="sm">Roles</Text>
        {roles.map((role) => (
          <Badge key={role} variant="outline">
            {role}
          </Badge>
        ))}
      </div>
    </Card>
  );
}

export default CommunityMemberCard;
