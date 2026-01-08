import { useMutation } from "@tanstack/react-query";
import { zenaoClient } from "@/lib/zenao-client";

interface StartCommunityStripeOnboardingRequest {
  token: string;
  communityId: string;
  returnPath: string;
  refreshPath: string;
}

export const useStartCommunityStripeOnboarding = () => {
  const { mutateAsync, isPending, isSuccess, isError } = useMutation({
    mutationFn: async ({
      token,
      communityId,
      returnPath,
      refreshPath,
    }: StartCommunityStripeOnboardingRequest) => {
      if (!token) throw new Error("Missing auth token");

      const res = await zenaoClient.startCommunityStripeOnboarding(
        { communityId, returnPath, refreshPath },
        { headers: { Authorization: "Bearer " + token } },
      );

      return res.onboardingUrl;
    },
  });

  return {
    mutateAsync,
    isPending,
    isSuccess,
    isError,
  };
};
