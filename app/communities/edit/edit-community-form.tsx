// components/features/community/create-community-form.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import React from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useEditCommunity } from "@/lib/mutations/community-edit";
import { captureException } from "@/lib/report";

const communityFormSchema = z.object({
  displayName: z.string().min(3, "Name too short"),
  description: z.string().min(5),
  avatarUri: z.string().url().optional().or(z.literal("")),
  bannerUri: z.string().url().optional().or(z.literal("")),
  administrators: z.array(z.string()).min(1),
});

type CommunityFormSchemaType = z.infer<typeof communityFormSchema>;

export const EditCommunityForm: React.FC = () => {
  const { getToken, userId } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<CommunityFormSchemaType>({
    resolver: zodResolver(communityFormSchema),
    mode: "all",
    defaultValues: {
      displayName: "",
      description: "",
      avatarUri: "",
      bannerUri: "",
      administrators: userId ? [userId] : [],
    },
  });

  const { editCommunity, isPending } = useEditCommunity();

  const onSubmit = async (values: CommunityFormSchemaType) => {
    try {
      const token = await getToken();
      if (!token) throw new Error("Invalid Clerk token");

      const { communityId } = await editCommunity({ ...values, token });
      form.reset();
      toast({ title: "toast-creation-success" });
      router.push(`/community/${communityId}`);
    } catch (err) {
      captureException(err);
      toast({
        variant: "destructive",
        title: "toast-creation-error",
      });
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label className="block text-sm font-medium">Name</label>
        <input
          {...form.register("displayName")}
          className="mt-1 block w-full"
        />
        {form.formState.errors.displayName && (
          <p className="text-red-500 text-sm">
            {form.formState.errors.displayName.message}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium">Description</label>
        <textarea
          {...form.register("description")}
          className="mt-1 block w-full"
        />
        {form.formState.errors.description && (
          <p className="text-red-500 text-sm">
            {form.formState.errors.description.message}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium">
          Avatar URI (opt)
        </label>
        <input {...form.register("avatarUri")} className="mt-1 block w-full" />
      </div>

      <div>
        <label className="block text-sm font-medium">
          Banner URI (opt)
        </label>
        <input {...form.register("bannerUri")} className="mt-1 block w-full" />
      </div>

      // administrators

      <button
        type="submit"
        disabled={isPending}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        {isPending ? "Editing..." : "Edit Community"}
      </button>
    </form>
  );
};
