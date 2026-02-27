import { auth } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import { OrderDetails } from "./order-details";
import {
  ScreenContainer,
  ScreenContainerCentered,
} from "@/components/layout/screen-container";
import { getQueryClient } from "@/lib/get-query-client";
import { userInfoOptions } from "@/lib/queries/user";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function OrderPage({ params }: PageProps) {
  const { id } = await params;
  const t = await getTranslations("order");

  const { getToken, userId } = await auth();
  const token = await getToken();

  const queryClient = getQueryClient();
  const userAddrOpts = userInfoOptions(getToken, userId);
  const userInfo = await queryClient.fetchQuery(userAddrOpts);
  const userProfileId = userInfo?.userId;

  if (!token || !userProfileId) {
    return (
      <ScreenContainerCentered isSignedOutModal>
        {t("log-in")}
      </ScreenContainerCentered>
    );
  }

  return (
    <ScreenContainer>
      <OrderDetails orderId={id} />
    </ScreenContainer>
  );
}
