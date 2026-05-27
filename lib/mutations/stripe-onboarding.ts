import { useMutation } from "@tanstack/react-query";
import { zenaoClient } from "@/lib/zenao-client";
import { useHeaderBuilder } from "@/hooks/use-header-builder";

interface StartCommunityStripeOnboardingRequest {
  token: string;
  communityId: string;
  returnPath: string;
  refreshPath: string;
}

export const useStartCommunityStripeOnboarding = () => {
  const { buildHeaders } = useHeaderBuilder();

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
        { headers: buildHeaders(token) },
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
