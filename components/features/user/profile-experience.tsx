import { PencilIcon, XIcon } from "lucide-react";
import { useLocale } from "next-intl";
import { Button } from "@/components/shadcn/button";
import Text from "@/components/widgets/texts/text";
import { UserExperienceSchemaType } from "@/types/schemas";
import { cn } from "@/lib/tailwind";

interface ProfileExperienceProps {
  unique?: boolean;
  experience: UserExperienceSchemaType;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function ProfileExperience({
  unique = false,
  experience,
  onEdit,
  onDelete,
}: ProfileExperienceProps) {
  const locale = useLocale();
  return (
    <div
      className={cn(
        "flex flex-row items-center pb-4 gap-2",
        !unique && "border-b",
      )}
    >
      <div className="grow flex flex-col gap-4">
        <div className="flex flex-col">
          <Text>{experience.title}</Text>
          <Text variant="secondary">{experience.organization}</Text>
          <Text variant="secondary">
            {new Date(
              experience.start.year,
              experience.start.month - 1,
            ).toLocaleString(locale, { month: "long" })}{" "}
            {experience.start.year} -{" "}
            {experience.end
              ? `${new Date(experience.end.year, experience.end.month - 1).toLocaleString(locale, { month: "long" })} ${experience.end.year}`
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
