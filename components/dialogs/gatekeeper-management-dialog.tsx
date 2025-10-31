"use client";

import { useFieldArray, useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@clerk/nextjs";
import { captureException } from "@sentry/nextjs";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "../shadcn/drawer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../shadcn/dialog";
import { Form } from "../shadcn/form";
import { Button } from "../shadcn/button";
import Text from "../widgets/texts/text";
import { FormFieldInputString } from "../widgets/form/form-field-input-string";
import { ButtonWithChildren } from "../widgets/buttons/button-with-children";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  EventFormSchemaType,
  EmailSchemaType,
  emailSchema,
  eventFormSchema,
} from "@/types/schemas";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";
import { makeLocationFromEvent } from "@/lib/location";
import { useEditEvent } from "@/lib/mutations/event-management";
import { useToast } from "@/hooks/use-toast";
import {
  communitiesListByEvent,
  communityIdFromPkgPath,
  DEFAULT_COMMUNITIES_LIMIT,
} from "@/lib/queries/community";

function GatekeeperManagementForm({
  form,
}: {
  form: UseFormReturn<EventFormSchemaType>;
}) {
  const {
    fields: optionFields,
    append: appendOption,
    remove: removeOption,
  } = useFieldArray({
    control: form.control,
    name: "gatekeepers",
  });
  const t = useTranslations("gatekeeper-management-dialog");
  const {
    control,
    reset,
    handleSubmit,
    formState: { isValid, isDirty, ...formState },
    ...rest
  } = useForm<EmailSchemaType>({
    mode: "all",
    reValidateMode: "onChange",
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = ({ email }: EmailSchemaType) => {
    appendOption({ email });
    reset();
  };

  const isAddButtonEnabled = isValid && isDirty;

  return (
    <Form
      {...{
        control,
        reset,
        handleSubmit,
        formState: { isDirty, isValid, ...formState },
        ...rest,
      }}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2">
        <div className="w-full grid grid-cols-10 gap-2">
          <div className="col-span-9">
            <FormFieldInputString
              control={control}
              name="email"
              className="w-full"
              placeholder={t("input-placeholder")}
            />
          </div>
          <div className="col-span-1">
            <Button
              type="submit"
              variant={isAddButtonEnabled ? "default" : "outline"}
              aria-label="add gatekeeper"
              disabled={!isAddButtonEnabled}
              className="aspect-square w-full h-12"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {isAddButtonEnabled && (
          <Text className="text-xs text-muted-foreground -mt-1">
            {t("click-add-hint")}
          </Text>
        )}
      </form>

      <ol className="w-full list-decimal">
        <li className="flex items-center text-sm text-muted-foreground mb-2">
          <Text className="text-muted-foreground">{t("default")}</Text>
        </li>
        {optionFields.map((field, index) => (
          <li
            key={field.id}
            className="flex items-center justify-between gap-2 mb-2"
          >
            <Text>{field.email}</Text>
            <Button
              type="button"
              aria-label="delete gatekeeper"
              variant="ghost"
              className="aspect-square p-0"
              onClick={() => removeOption(index)}
            >
              <X className="w-4 h-4" />
            </Button>
          </li>
        ))}
      </ol>
    </Form>
  );
}

export function GatekeeperManagementDialog({
  eventId,
  eventInfo,
  gatekeepers,
  open,
  onOpenChange,
}: {
  eventId: string;
  eventInfo: EventInfo;
  gatekeepers: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const { getToken } = useAuth();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const isStandalone = useMediaQuery("(display-mode: standalone)");
  const t = useTranslations("gatekeeper-management-dialog");

  const { data: communitiesPages } = useSuspenseInfiniteQuery(
    communitiesListByEvent(eventId, DEFAULT_COMMUNITIES_LIMIT),
  );
  const communities = useMemo(
    () => communitiesPages.pages.flat(),
    [communitiesPages],
  );

  const communityId =
    communities.length > 0
      ? communityIdFromPkgPath(communities[0].pkgPath)
      : null;

  const location = makeLocationFromEvent(eventInfo.location);
  const defaultValues: EventFormSchemaType = {
    ...eventInfo,
    location,
    gatekeepers: gatekeepers.map((gatekeeperEmail) => ({
      email: gatekeeperEmail,
    })),
    exclusive: eventInfo.privacy?.eventPrivacy.case === "guarded",
    password: "",
    communityId: communityId || null,
  };

  const form = useForm<EventFormSchemaType>({
    mode: "all",
    resolver: zodResolver(eventFormSchema),
    defaultValues,
  });

  const { editEvent, isPending } = useEditEvent(getToken);

  const onSubmit = async (values: EventFormSchemaType) => {
    try {
      await editEvent({ ...values, eventId });
      onOpenChange(false);
      toast({
        title: t("toast-gatekeeper-management-success"),
      });
    } catch (err) {
      captureException(err);
      toast({
        variant: "destructive",
        title: t("toast-gatekeeper-management-error"),
      });
    }
  };

  if (isDesktop) {
    return (
      <Form {...form}>
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="flex flex-col gap-8 max-h-screen overflow-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">{t("title")}</DialogTitle>
              <DialogDescription className="text-base">
                {t("description")}
              </DialogDescription>
            </DialogHeader>
            <GatekeeperManagementForm form={form} />
            <DialogFooter>
              <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">
                <ButtonWithChildren
                  className="w-full"
                  type="submit"
                  loading={isPending}
                  variant="outline"
                >
                  {t("done")}
                </ButtonWithChildren>
              </form>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Form>
    );
  }

  return (
    <Form {...form}>
      <Drawer open={open} onOpenChange={onOpenChange} modal={!isStandalone}>
        <DrawerContent className="flex flex-col gap-8 pb-8 px-4 max-h-full overflow-auto">
          <DrawerHeader>
            <DrawerTitle className="text-xl">{t("title")}</DrawerTitle>
            <DrawerDescription className="text-base">
              {t("description")}
            </DrawerDescription>
          </DrawerHeader>
          <GatekeeperManagementForm form={form} />
          <DrawerFooter>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="w-full h-fit"
            >
              <ButtonWithChildren
                className="w-full"
                type="submit"
                variant="outline"
                loading={isPending}
              >
                {t("done")}
              </ButtonWithChildren>
            </form>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </Form>
  );
}
