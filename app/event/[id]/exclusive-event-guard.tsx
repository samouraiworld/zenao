"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Lock } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import Heading from "@/components/texts/heading";
import Text from "@/components/texts/text";
import { Form } from "@/components/shadcn/form";
import { FormFieldInputString } from "@/components/form/components/FormFieldInputString";
import { ButtonWithChildren } from "@/components/buttons/ButtonWithChildren";
import {
  eventProtectionFormSchema,
  EventProtectionFormSchemaType,
} from "@/components/form/types";

type ExclusiveEventGuardProps = {
  eventId: string;
  exclusive?: boolean;
  children?: React.ReactNode;
};

export function ExclusiveEventGuard({
  eventId,
  exclusive = false,
  children,
}: ExclusiveEventGuardProps) {
  const [canAccess, setCanAccess] = useState<boolean>(!exclusive);
  const form = useForm<EventProtectionFormSchemaType>({
    mode: "all",
    resolver: zodResolver(eventProtectionFormSchema),
    defaultValues: {
      password: "",
    },
  });

  const onSubmit = async (data: EventProtectionFormSchemaType) => {
    console.log(eventId, data);

    // Call the API to check if the password is correct
    // Display error message if incorrect
    // For now, we will just simulate a successful password check
    setCanAccess(true);
  };

  if (canAccess) {
    return children;
  }

  return (
    <div className="flex flex-col gap-4 items-center justify-center w-full h-full">
      <Heading level={2} size="2xl">
        Exclusive Event
      </Heading>
      <Text>
        This event is exclusive to certain participants. You need a password to
        access information.
      </Text>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full flex flex-col max-w-sm mt-6 gap-4"
        >
          <FormFieldInputString
            control={form.control}
            name="password"
            placeholder="Enter password"
            inputType="password"
          />
          <ButtonWithChildren type="submit" className="w-full rounded">
            <div className="flex items-center">
              <Lock className="mr-2" />
              Access event
            </div>
          </ButtonWithChildren>
        </form>
      </Form>
    </div>
  );
}
