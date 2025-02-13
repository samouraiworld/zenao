"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useSession } from "@clerk/nextjs";
import { zenaoClient } from "../zenao-client";
import { useToast } from "@/app/hooks/use-toast";
import { userFormSchema, UserFormSchemaType } from "@/components/form/types";
import { Form } from "@/components/shadcn/form";
import { FormFieldInputString } from "@/components/form/components/FormFieldInputString";
import { Card } from "@/components/cards/Card";
import { ButtonWithLabel } from "@/components/buttons/ButtonWithLabel";
import { FormFieldTextArea } from "@/components/form/components/FormFieldTextArea";
import { FormFieldURI } from "@/components/form/components/FormFieldURI";

export const EditUserForm: React.FC = () => {
  const { session } = useSession();
  const [loading, setLoading] = useState<boolean>(false);
  const form = useForm<UserFormSchemaType>({
    mode: "all",
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      bio: "",
      avatarUri: "",
    },
  });
  const { toast } = useToast();

  const onSubmit = async (values: UserFormSchemaType) => {
    try {
      setLoading(true);
      const token = await session?.getToken();
      if (!token) {
        throw new Error("invalid clerk token");
      }
      await zenaoClient.editUser(values, {
        headers: { Authorization: "Bearer " + token },
      });
      form.reset();
      toast({
        title: "Edited!",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error on editing user!",
      });
      console.error("error", err);
    }
    setLoading(false);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="items-center sm:h-full"
      >
        <div className="flex flex-col sm:flex-row w-full gap-10">
          <FormFieldURI<UserFormSchemaType>
            form={form}
            name="avatarUri"
            placeholder="avatarURI"
          />
          <div className="flex flex-col gap-4 w-full sm:w-3/5">
            <Card>
              <FormFieldInputString<UserFormSchemaType>
                control={form.control}
                name="username"
                placeholder="Username..."
              />
            </Card>
            <Card>
              <FormFieldTextArea<UserFormSchemaType>
                control={form.control}
                name="bio"
                placeholder="Bio..."
              />
            </Card>
            <div>
              <ButtonWithLabel
                loading={loading}
                label="Save changes"
                type="submit"
              />
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
};
