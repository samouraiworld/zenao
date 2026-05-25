import { useFieldArray, useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { EventFormSchemaType } from "@/types/schemas";
import { PriceGroupFieldSet } from "@/components/features/event/price-group-field-set";
import { FormDescription } from "@/components/shadcn/form";
import { useCurrencyOptionsForCommunity } from "@/lib/pricing";

export default function DashboardFormPrices() {
  const t = useTranslations("eventForm");
  const form = useFormContext<EventFormSchemaType>();
  const communityID = form.watch("communityId");

  const { options: currencyOptions, isLoading: payoutLoading } =
    useCurrencyOptionsForCommunity(communityID);

  const { fields: priceGroupFields } = useFieldArray({
    control: form.control,
    name: "pricesGroups",
  });

  return (
    <>
      {(priceGroupFields.length > 0 ? priceGroupFields : [{ id: "new" }]).map(
        (group, index) => (
          <PriceGroupFieldSet
            key={group.id ?? index}
            form={form}
            groupIndex={index}
            currencyOptions={currencyOptions}
            disabled={!communityID}
          />
        ),
      )}
      <FormDescription>
        {t("price-helper")}
        {!communityID ? (
          ` ${t("price-community-required")}`
        ) : !payoutLoading && currencyOptions.length < 2 ? (
          <>
            {" "}
            {t("price-stripe-not-configured")}{" "}
            <Link
              href={`/dashboard/community/${communityID}/payouts`}
              className="text-main hover:underline"
            >
              {t("price-stripe-setup-link")}
            </Link>
          </>
        ) : null}
      </FormDescription>
    </>
  );
}
