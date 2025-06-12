import { useFieldArray, useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X } from "lucide-react";
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
import {
  emailSchema,
  EmailSchemaType,
  EventFormSchemaType,
} from "../form/types";
import { Form } from "../shadcn/form";
import { FormFieldInputString } from "../form/components/form-field-input-string";
import { Button } from "../shadcn/button";
import Text from "../texts/text";
import { useMediaQuery } from "@/app/hooks/use-media-query";

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
  const internalForm = useForm<EmailSchemaType>({
    mode: "all",
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = ({ email }: EmailSchemaType) => {
    appendOption({ email });
    internalForm.reset();
  };

  return (
    <Form {...internalForm}>
      <form
        onSubmit={internalForm.handleSubmit(onSubmit)}
        className="flex flex-col gap-2"
      >
        <div className="w-full grid grid-cols-10 gap-2">
          <div className="col-span-9">
            <FormFieldInputString
              control={internalForm.control}
              name="email"
              className="w-full"
              placeholder="Enter email"
            />
          </div>
          <div className="col-span-1">
            <Button
              type="submit"
              variant="outline"
              disabled={
                !internalForm.formState.isValid ||
                !internalForm.formState.isDirty
              }
              className="aspect-square w-full h-12"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </form>

      <ol className="w-full list-decimal">
        <li className="flex items-center text-sm text-muted-foreground mb-2">
          <Text className="text-muted-foreground">Default (You)</Text>
        </li>
        {optionFields.map((field, index) => (
          <li
            key={field.id}
            className="flex items-center justify-between gap-2 mb-2"
          >
            <Text>{field.email}</Text>
            <Button
              type="button"
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
  open,
  onOpenChange,
  form,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: UseFormReturn<EventFormSchemaType>;
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const isStandalone = useMediaQuery("(display-mode: standalone)");
  // const t = useTranslations("guest-registration-success-dialog");

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex flex-col gap-8 max-h-screen overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Manage gatekeepers</DialogTitle>
            <DialogDescription className="text-base">Test</DialogDescription>
          </DialogHeader>
          <GatekeeperManagementForm form={form} />
          <DialogFooter>
            <Button
              className="w-full"
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} modal={!isStandalone}>
      <DrawerContent className="flex flex-col gap-8 pb-8 px-4 max-h-full overflow-auto">
        <DrawerHeader>
          <DrawerTitle className="text-xl">Manage gatekeepers</DrawerTitle>
          <DrawerDescription className="text-base">Test</DrawerDescription>
        </DrawerHeader>
        <GatekeeperManagementForm form={form} />
        <DrawerFooter>
          <Button
            className="w-full"
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
