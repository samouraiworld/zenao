import { useTranslations } from "next-intl";
import { Calendar } from "lucide-react";
import { AspectRatio } from "@/components/shadcn/aspect-ratio";
import { Skeleton } from "@/components/shadcn/skeleton";
import Text from "@/components/widgets/texts/text";
import { EventLocationSkeleton } from "@/components/features/event/event-location-section";
import { EventSection } from "@/components/features/event/event-section";
import { GnowebButton } from "@/components/widgets/buttons/gnoweb-button";
import { UserAvatarWithNameSkeleton } from "@/components/features/user/user";

const iconSize = 20;

export function EventInfoLayoutSkeleton() {
  const t = useTranslations("event");

  return (
    <div className="flex flex-col w-full sm:h-full gap-8">
      <div className="flex flex-col w-full sm:flex-row sm:h-full gap-10">
        <div className="flex flex-col w-full sm:w-3/6">
          <AspectRatio ratio={16 / 9}>
            <Skeleton style={{ width: "100%", height: "100%" }} />
          </AspectRatio>
        </div>

        {/* Right Section */}
        <div className="flex flex-col gap-4 w-full sm:w-3/6">
          <Skeleton className="h-[2.5rem] w-60 mb-7" />
          <div className="flex flex-row gap-4 items-center">
            <Calendar width={iconSize} height={iconSize} />
            <div className="flex flex-col">
              <Skeleton className="h-[1.25rem] my-[0.25rem] w-40" />
              <div className="flex flex-row text-sm gap-1">
                <Skeleton className="h-[0.875rem] my-[0.1875rem] w-20" />
                <Text variant="secondary" size="sm">
                  -
                </Text>
                <Skeleton className="h-[0.875rem] my-[0.1875rem] w-40" />
              </div>
            </div>
          </div>

          {/* Location */}
          <EventLocationSkeleton />

          <GnowebButton href={""} />
        </div>
      </div>

      <div className="grid grid-cols-6 gap-10">
        {/* Host section */}
        <div className="col-span-6 sm:col-span-3">
          <EventSection title={t("hosted-by")}>
            <UserAvatarWithNameSkeleton />
          </EventSection>
        </div>

        {/* Participants preview and dialog section */}
        <div className="col-span-6 sm:col-span-3"></div>
      </div>

      <Skeleton className="w-full h-28" />
    </div>
  );
}
