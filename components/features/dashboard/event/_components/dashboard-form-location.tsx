import { useFormContext } from "react-hook-form";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import DashboardFormMap from "./dashboard-form-map";
import { EventFormSchemaType } from "@/types/schemas";
import { Switch } from "@/components/shadcn/switch";
import { Label } from "@/components/shadcn/label";
import { FormFieldInputString } from "@/components/widgets/form/form-field-input-string";
import { FormFieldLocation } from "@/components/widgets/form/form-field-location";
import { TimeZonesPopover } from "@/components/widgets/form/time-zones-popover";
import { currentTimezone } from "@/lib/time";

export default function DashboardFormLocation() {
  const t = useTranslations("eventForm");
  const form = useFormContext<EventFormSchemaType>();
  const location = form.watch("location");

  const [isVirtual, setIsVirtual] = useState<boolean>(
    location.kind === "virtual" || false,
  );
  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const isCustom = useMemo(() => !isVirtual && !marker, [isVirtual, marker]);

  useEffect(() => {
    if (location.kind === "geo") {
      setMarker({ lat: location.lat, lng: location.lng });
    }
  }, [location]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Switch
          id="virtual"
          checked={isVirtual}
          onCheckedChange={(checked: boolean) => {
            if (checked) {
              form.setValue("location", {
                kind: "virtual",
                location: "",
              });
            } else {
              form.setValue("location", {
                kind: "custom",
                address: "",
                timeZone: currentTimezone(),
              });
            }
            // We have to clear errors between changing location kinds
            // If we have an error in virtual location and we change to custom, error stay as undefined and can't be clear
            form.clearErrors("location");
            setMarker(null);
            setIsVirtual(checked);
          }}
        />
        <Label htmlFor="virtual">{t("onlineEvent")}</Label>
      </div>
      {isVirtual && location.kind === "virtual" ? (
        <FormFieldInputString
          control={form.control}
          name="location.location"
          placeholder={t("virtual-uri-placeholder")}
        />
      ) : (
        <FormFieldLocation form={form} onRemove={() => setMarker(null)} />
      )}
      <div className="md:hidden">
        <DashboardFormMap />
      </div>
      {isCustom && location.kind === "custom" && location.address && (
        <TimeZonesPopover
          defaultValue={location.timeZone}
          handleSelect={(timeZone: string) => {
            form.setValue("location", {
              ...location,
              timeZone,
            });
          }}
        />
      )}
    </div>
  );
}
