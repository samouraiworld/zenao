import { UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  fromUnixTime,
  getUnixTime,
  hoursToMinutes,
  isSameDay,
  minutesToSeconds,
} from "date-fns";
import { AudioWaveformIcon, ImageIcon } from "lucide-react";
import { Card } from "../cards/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../shadcn/tabs";
import { MarkdownPreview } from "../common/markdown-preview";
import { ButtonWithLabel } from "../buttons/button-with-label";
import { Switch } from "../shadcn/switch";
import { Label } from "../shadcn/label";
import MapCaller from "../common/map/map-lazy-components";
import Text from "../texts/text";
import { Button } from "../shadcn/button";
import { GatekeeperManagementDialog } from "../dialogs/gatekeeper-management-dialog";
import { FormFieldInputString } from "./components/form-field-input-string";
import { FormFieldInputNumber } from "./components/form-field-input-number";
import { TimeZonesPopover } from "./components/time-zones-popover";
import { FormFieldImage } from "./components/form-field-image";
import { EventFormSchemaType } from "./types";
import { FormFieldTextArea } from "./components/form-field-textarea";
import { FormFieldLocation } from "./components/form-field-location";
import { FormFieldDatePicker } from "./components/form-field-date-picker";
import { FormFieldSwitch } from "./components/form-field-switch";
import { Form, FormDescription } from "@/components/shadcn/form";
import { currentTimezone } from "@/lib/time";
import { cn } from "@/lib/tailwind";
import { useLocationTimezone } from "@/app/hooks/use-location-timezone";
import { useToast } from "@/app/hooks/use-toast";
import useMarkdownUpload from "@/app/hooks/use-markdown-upload";
import { useMediaQuery } from "@/app/hooks/use-media-query";

interface EventFormProps {
  form: UseFormReturn<EventFormSchemaType>;
  onSubmit: (values: EventFormSchemaType) => Promise<void>;
  isLoaded: boolean;
  defaultExclusive?: boolean;
  isEditing?: boolean;
  minDateRange?: Date;
  maxDateRange?: Date;
}

export const EventForm: React.FC<EventFormProps> = ({
  form,
  onSubmit,
  isLoaded,
  defaultExclusive,
  minDateRange,
  maxDateRange,
  isEditing = false,
}) => {
  const { toast } = useToast();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const description = form.watch("description");
  const location = form.watch("location");
  const startDate = form.watch("startDate");
  const endDate = form.watch("endDate");
  const imageUri = form.watch("imageUri");
  const exclusive = form.watch("exclusive");
  const gatekeepers = form.watch("gatekeepers");
  const t = useTranslations("eventForm");

  const [gatekeeperDialogOpen, setGatekeeperDialogOpen] =
    useState<boolean>(false);
  const [isVirtual, setIsVirtual] = useState<boolean>(
    location.kind === "virtual" || false,
  );
  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const isCustom = useMemo(() => !isVirtual && !marker, [isVirtual, marker]);
  const timeZone = useLocationTimezone(location);

  // Upload
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const hiddenAudioInputRef = useRef<HTMLInputElement>(null);
  const hiddenImgInputRef = useRef<HTMLInputElement>(null);

  const { uploadMdFile, uploading, setCursor } =
    useMarkdownUpload(descriptionRef);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target?.files?.[0];
    if (!file) {
      toast({
        variant: "destructive",
        title: "No file selected.",
      });
      return;
    }

    await uploadMdFile(
      file,
      "image",
      (text) => {
        form.setValue("description", text);
      },
      (text) => {
        form.setValue("description", text);
        descriptionRef.current?.focus();
      },
    );
  };

  const handleAudioChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target?.files?.[0];
    if (!file) {
      toast({
        variant: "destructive",
        title: "No file selected.",
      });
      return;
    }

    await uploadMdFile(
      file,
      "audio",
      (text) => {
        form.setValue("description", text);
      },
      (text) => {
        form.setValue("description", text);
        descriptionRef.current?.focus();
      },
    );
  };

  useEffect(() => {
    if (location.kind === "geo") {
      setMarker({ lat: location.lat, lng: location.lng });
    }
  }, [location]);

  useEffect(() => {
    if (!exclusive) {
      form.setValue("password", "");
    } else {
      form.setValue("password", undefined);
    }
  }, [exclusive, form]);

  return (
    <>
      <GatekeeperManagementDialog
        open={gatekeeperDialogOpen}
        onOpenChange={setGatekeeperDialogOpen}
        form={form}
      />
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex w-full flex-col sm:flex-row sm:h-full gap-10"
        >
          <div className="flex flex-col w-full gap-10 md:gap-4">
            <FormFieldImage
              name="imageUri"
              control={form.control}
              placeholder={t("image-uri-placeholder")}
              aspectRatio={16 / 9}
              tooltip={imageUri ? <Text>{t("change-image")}</Text> : null}
            />
            {isDesktop && (
              <Button
                variant="secondary"
                className="w-fit"
                type="button"
                onClick={() => setGatekeeperDialogOpen(true)}
              >
                Manage gatekeepers ({1 + gatekeepers.length})
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-6 w-full">
            <FormFieldTextArea
              control={form.control}
              name="title"
              className={cn(
                "font-semibold text-3xl overflow-hidden bg-transparent",
                "border-0 focus-visible:ring-transparent p-0 w-full placeholder:text-secondary-color",
              )}
              placeholder={t("title-placeholder")}
              maxLength={140}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  // method to prevent from default behaviour
                  e.preventDefault();
                }
              }}
              wordCounter
            />
            <Card className="rounded px-3 border-custom-input-border">
              <Tabs defaultValue="write" className="w-full">
                <TabsList className="grid w-full grid-cols-2" tabIndex={-1}>
                  <TabsTrigger value="write">{t("write-tab")}</TabsTrigger>
                  <TabsTrigger value="preview">{t("preview-tab")}</TabsTrigger>
                </TabsList>
                <TabsContent value="write" tabIndex={-1}>
                  <div className="flex flex-col gap-2 w-full">
                    <FormFieldTextArea
                      ref={descriptionRef}
                      control={form.control}
                      name="description"
                      placeholder={t("description-placeholder")}
                      className={cn(
                        "bg-transparent",
                        "border-0 focus-visible:ring-transparent p-0 w-full placeholder:text-secondary-color",
                      )}
                      maxLength={10000}
                      wordCounter
                    />
                    {/* Upload image buttons */}
                    <div className="flex flex-row gap-2 self-end">
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-fit flex items-center justify-center cursor-pointer",
                          "hover:bg-neutral-700",
                        )}
                        title="Add image"
                        onClick={(e) => {
                          e.preventDefault();
                          if (uploading) return;

                          setCursor(
                            descriptionRef.current?.selectionStart ??
                              descriptionRef.current?.textLength ??
                              0,
                          );
                          hiddenImgInputRef.current?.click();
                        }}
                        aria-label="Add image"
                      >
                        <ImageIcon className="!h-4 !w-4" />
                      </Button>
                      <input
                        type="file"
                        onChange={handleImageChange}
                        ref={hiddenImgInputRef}
                        className="hidden"
                        disabled={uploading}
                      />

                      <Button
                        variant="ghost"
                        className={cn(
                          "w-fit flex px-4 items-center justify-center cursor-pointer",
                          "hover:bg-neutral-700",
                        )}
                        title="Add audio"
                        onClick={(e) => {
                          e.preventDefault();
                          if (uploading) return;

                          setCursor(
                            descriptionRef.current?.selectionStart ??
                              descriptionRef.current?.textLength ??
                              0,
                          );
                          hiddenAudioInputRef.current?.click();
                        }}
                        aria-label="Add audio"
                      >
                        <AudioWaveformIcon className="!h-4 !w-4" />
                      </Button>
                      <input
                        type="file"
                        onChange={handleAudioChange}
                        ref={hiddenAudioInputRef}
                        className="hidden"
                        disabled={uploading}
                      />
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="preview">
                  <MarkdownPreview markdownString={description} />
                </TabsContent>
              </Tabs>
            </Card>
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
              <Label htmlFor="virtual">Online event</Label>
            </div>
            {isVirtual && location.kind === "virtual" ? (
              <FormFieldInputString
                control={form.control}
                name="location.location"
                placeholder={"URI..."}
              />
            ) : (
              <FormFieldLocation form={form} onRemove={() => setMarker(null)} />
            )}
            {!isVirtual && location && marker && (
              <MapCaller lat={marker.lat} lng={marker.lng} />
            )}
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
            <FormFieldInputNumber
              control={form.control}
              name="capacity"
              placeholder={t("capacity-placeholder")}
              label={t("capacity-label")}
            />
            <FormFieldDatePicker
              name="startDate"
              label={t("from")}
              control={form.control}
              placeholder={t("pick-a-start-date-placeholder")}
              timeZone={timeZone}
              onChange={(date) => {
                if (!endDate || date > fromUnixTime(Number(endDate))) {
                  form.setValue(
                    "endDate",
                    BigInt(getUnixTime(date) + minutesToSeconds(15)),
                  );
                }
              }}
              disabledDates={[
                ...(minDateRange
                  ? [
                      {
                        before: minDateRange,
                      },
                    ]
                  : []),
                ...(maxDateRange
                  ? [
                      {
                        after: maxDateRange,
                      },
                    ]
                  : []),
              ]}
              disabledHours={[
                ...(minDateRange
                  ? [
                      {
                        before: minDateRange,
                      },
                    ]
                  : []),
              ]}
            />
            <FormFieldDatePicker
              name="endDate"
              label={t("to")}
              control={form.control}
              placeholder={t("pick-a-end-date-placeholder")}
              timeZone={timeZone}
              disabled={!startDate}
              disabledHours={[
                (date) => {
                  if (startDate) {
                    // We accept events on the same day
                    const currentStartDate = fromUnixTime(Number(startDate));

                    return (
                      isSameDay(currentStartDate, date) &&
                      hoursToMinutes(currentStartDate.getHours()) +
                        currentStartDate.getMinutes() +
                        15 /* Event duration 15 minutes minimum */ >
                        date.getHours() * 60 + date.getMinutes()
                    );
                  }

                  return false;
                },
              ]}
              disabledDates={[
                ...(minDateRange
                  ? [
                      {
                        before: minDateRange,
                      },
                    ]
                  : []),
                ...(maxDateRange
                  ? [
                      {
                        after: maxDateRange,
                      },
                    ]
                  : []),
                (date) => {
                  if (startDate) {
                    // We accept events on the same day
                    const currentStartDate = fromUnixTime(Number(startDate));

                    return (
                      !isSameDay(currentStartDate, date) &&
                      currentStartDate > date
                    );
                  }

                  return false;
                },
              ]}
            />
            <FormDescription>
              Displayed time corresponds to {timeZone}
            </FormDescription>

            {/* Private option */}
            <FormFieldSwitch
              control={form.control}
              name="exclusive"
              label={"Protect access with password"}
            />

            {exclusive && (
              <FormFieldInputString
                control={form.control}
                name="password"
                inputType="password"
                placeholder={
                  isEditing && defaultExclusive
                    ? t("no-changes-password-placeholder")
                    : t("password-placeholder")
                }
                label={t("password-label")}
              />
            )}

            {!isDesktop && (
              <Button
                variant="secondary"
                className="w-full"
                type="button"
                onClick={() => setGatekeeperDialogOpen(true)}
              >
                Manage gatekeepers ({1 + gatekeepers.length})
              </Button>
            )}

            <ButtonWithLabel
              loading={isLoaded}
              label={
                isEditing ? t("edit-event-button") : t("create-event-button")
              }
              type="submit"
            />
          </div>
        </form>
      </Form>
    </>
  );
};
