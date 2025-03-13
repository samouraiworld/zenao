"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { ScreenContainerCentered } from "@/components/layout/ScreenContainer";
import { VeryLargeText } from "@/components/texts/VeryLargeText";
import { SmallText } from "@/components/texts/SmallText";
import { ButtonWithChildren } from "@/components/buttons/ButtonWithChildren";
import { FormFieldDatePickerV2 } from "@/components/form/components/form-field-date-picker";
import { Form } from "@/components/shadcn/form";

export default function Home() {
  const t = useTranslations("home");

  const form = useForm<{
    startDate: bigint /* Timestamp */;
  }>({
    mode: "all",
    defaultValues: {
      startDate: BigInt(0),
    },
  });

  const onSubmit = ({ startDate }: { startDate: bigint }) => {
    console.log(startDate);
  };

  return (
    <ScreenContainerCentered>
      <div className="flex flex-col items-center">
        <Image
          src="/zenao-logo.png"
          alt="zeano logo"
          width={200}
          height={200}
          priority
          className="mb-5 mt-5"
        />
        <VeryLargeText className="w-[200px] text-center">
          {t("main-text")}
        </VeryLargeText>
        <SmallText className="my-10 w-[280px] text-center" variant="secondary">
          {t("secondary-text")}
        </SmallText>
        <Link href="/create">
          <ButtonWithChildren className="w-full flex rounded-3xl py-5">
            <SmallText variant="invert">{t("button")}</SmallText>
          </ButtonWithChildren>
        </Link>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex w-full sm:flex-row items-center sm:h-full"
          >
            <FormFieldDatePickerV2
              control={form.control}
              name="startDate"
              timeZone=""
            />
          </form>
        </Form>
      </div>
    </ScreenContainerCentered>
  );
}
