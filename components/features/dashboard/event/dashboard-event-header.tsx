"use client";

import Link from "next/link";
import { format as formatTZ } from "date-fns-tz";
import { fromUnixTime } from "date-fns";
import { useTranslations } from "next-intl";
import { EventImage } from "../../event/event-image";
import EventCommunitySection from "../../event/event-community-section";
import { EventSection } from "../../event/event-section";
import DashboardFormTitle from "./_components/dashboard-form-title";
import DashboardFormImage from "./_components/dashboard-form-image";
import DashboardFormDateTime from "./_components/dashboard-form-date-time";
import DashboardFormLocation from "./_components/dashboard-form-location";
import DashboardFormCapacity from "./_components/dashboard-form-capacity";
import DashboardFormCommunity from "./_components/dashboard-form-community";
import DashboardFormMap from "./_components/dashboard-form-map";
import { DashboardFormPrivacy } from "./_components/dashboard-form-privacy";
import DashboardFormActions from "./_components/dashboard-form-actions";
import Heading from "@/components/widgets/texts/heading";
import Text from "@/components/widgets/texts/text";
import { EventFormSchemaType } from "@/types/schemas";
import RoleBasedEditViewMode from "@/components/widgets/permissions/edit-view-mode";
import { useDashboardEventContext } from "@/components/providers/dashboard-event-context-provider";

interface DashboardEventHeaderProps {
  location: EventFormSchemaType["location"];
  communityId: string | null;
}

export default function DashboardEventHeader({
  location,
  communityId,
}: DashboardEventHeaderProps) {
  const t = useTranslations("dashboard.eventDetails.header");
  const { eventInfo, roles } = useDashboardEventContext();

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-col-1 md:grid-cols-2 gap-10">
        {/* Title of the event */}
        <RoleBasedEditViewMode
          roles={roles}
          allowedRoles={["organizer"]}
          edit={<DashboardFormTitle />}
          view={
            <Heading level={1} size="3xl" className="max-w-1/2">
              {eventInfo.title}
            </Heading>
          }
        />

        <RoleBasedEditViewMode
          roles={roles}
          allowedRoles={["organizer"]}
          edit={<DashboardFormActions />}
          view={null}
        />
      </div>

      <div className="flex flex-col w-full md:flex-row md:h-full gap-10">
        <div className="flex flex-col gap-8 w-full md:w-3/6">
          <RoleBasedEditViewMode
            roles={roles}
            allowedRoles={["organizer"]}
            edit={<DashboardFormImage />}
            view={
              <EventImage
                src={eventInfo.imageUri}
                sizes="(max-width: 768px) 100vw,
                  (max-width: 1200px) 50vw,
                  33vw"
                fill
                alt="Event"
                priority
                fetchPriority="high"
              />
            }
          />

          <div className="hidden md:block">
            <RoleBasedEditViewMode
              roles={roles}
              allowedRoles={["organizer"]}
              edit={<DashbaordFormMap />}
              view={null}
            />
          </div>
        </div>

        <div className="flex flex-col gap-8 w-full md:w-3/6">
          {/* Date & Time */}
          <EventSection title={t("dateAndTime")}>
            <RoleBasedEditViewMode
              roles={roles}
              allowedRoles={["organizer"]}
              edit={<DashboardFormDateTime minDateRange={new Date()} />}
              view={
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                      <Text>{t("from")}</Text>{" "}
                      <Text
                        variant="secondary"
                        size="sm"
                        suppressHydrationWarning
                      >
                        {formatTZ(
                          fromUnixTime(Number(eventInfo.startDate)),
                          "PPPp O",
                        )}
                      </Text>
                    </div>
                    <div className="flex flex-col">
                      <Text>{t("to")}</Text>{" "}
                      <Text
                        variant="secondary"
                        size="sm"
                        suppressHydrationWarning
                      >
                        {formatTZ(
                          fromUnixTime(Number(eventInfo.endDate)),
                          "PPPp O",
                        )}
                      </Text>
                    </div>
                  </div>
                </>
              }
            />
          </EventSection>

          {/* Location */}
          <EventSection title={t("location")}>
            <RoleBasedEditViewMode
              roles={roles}
              allowedRoles={["organizer"]}
              edit={<DashboardFormLocation />}
              view={
                <div className="flex flex-row gap-2 items-center">
                  {location.kind === "virtual" ? (
                    <Link href={location.location} target="_blank">
                      <Text className="hover:underline hover:underline-offset-1">
                        {location.location}
                      </Text>
                    </Link>
                  ) : location.kind === "geo" ? (
                    <Link
                      href={`https://www.openstreetmap.org/?mlat=${location.lat}&mlon=${location.lng}#map=17/${location.lat}/${location.lng}`}
                      target="_blank"
                    >
                      <div className="flex flex-row gap-1 group items-center">
                        <Text className="group-hover:underline">
                          {location.address}{" "}
                        </Text>
                      </div>
                    </Link>
                  ) : (
                    <Text>{location.address}</Text>
                  )}
                </div>
              }
            />
          </EventSection>

          <EventSection title={t("capacity")}>
            <RoleBasedEditViewMode
              roles={roles}
              allowedRoles={["organizer"]}
              edit={<DashboardFormCapacity />}
              view={
                <div className="flex gap-2">
                  <Text>
                    {eventInfo.capacity === 0
                      ? t("noPlaces")
                      : t("attendees", { count: eventInfo.capacity })}
                  </Text>
                </div>
              }
            />
          </EventSection>

          {/* Community */}
          <RoleBasedEditViewMode
            roles={roles}
            allowedRoles={["organizer"]}
            edit={
              <EventSection title={t("community")}>
                <DashboardFormCommunity />
              </EventSection>
            }
            view={
              communityId ? (
                <EventCommunitySection communityId={communityId} />
              ) : null
            }
          />

          {/* Security & Privacy */}
          <RoleBasedEditViewMode
            roles={roles}
            allowedRoles={["organizer"]}
            edit={
              <EventSection title={t("securityAndPrivacy")}>
                <DashboardFormPrivacy />
              </EventSection>
            }
            view={null}
          />
        </div>
      </div>
    </div>
  );
}
