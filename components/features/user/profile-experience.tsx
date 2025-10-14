import { PencilIcon, XIcon } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import Text from "@/components/widgets/texts/text";
import { UserExperienceSchemaType } from "@/types/schemas";

interface ProfileExperienceProps {
  experience: UserExperienceSchemaType;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function ProfileExperience({
  experience,
  onEdit,
  onDelete,
}: ProfileExperienceProps) {
  return (
    <div className="flex flex-row items-center border-b pb-4 gap-2">
      <div className="grow flex flex-col gap-4">
        <div className="flex flex-col">
          <Text>{experience.title}</Text>
          <Text variant="secondary">{experience.organization}</Text>
          <Text variant="secondary">
            {experience.start.month} {experience.start.year} -{" "}
            {experience.end
              ? `${experience.end.month} ${experience.end.year}`
              : "Present"}
          </Text>
        </div>
        <div>
          <Text>{experience.description}</Text>
        </div>
      </div>

      {/* Delete button */}
      <div className="flex items-center gap-2 ml-4">
        {onEdit && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 p-0"
            onClick={onEdit}
          >
            <span className="sr-only">Edit experience</span>
            <PencilIcon className="h-4 w-4" />
          </Button>
        )}
        {onDelete && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="h-8 w-8 p-0"
            onClick={onDelete}
          >
            <span className="sr-only">Delete experience</span>
            <XIcon className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
