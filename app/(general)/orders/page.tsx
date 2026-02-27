import { auth } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import { OrdersList } from "./orders-list";
import {
  ScreenContainer,
  ScreenContainerCentered,
} from "@/components/layout/screen-container";
import { getQueryClient } from "@/lib/get-query-client";
import { userInfoOptions } from "@/lib/queries/user";

export default async function OrdersPage() {
  const t = await getTranslations("orders");
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
      <OrdersList />
    </ScreenContainer>
  );
}
