import { useMutation } from "@tanstack/react-query";
import { getQueryClient } from "../get-query-client";
import { communityUsersWithRoles } from "../queries/community";
import { GetToken } from "../utils";
import { zenaoClient } from "@/lib/zenao-client";
import { useHeaderBuilder } from "@/hooks/use-header-builder";

type RemoveCommunityMemberRequest = {
  communityId: string;
  userId: string;
  getToken: GetToken;
};

export const useRemoveCommunityMember = () => {
  const queryClient = getQueryClient();
  const { buildHeaders } = useHeaderBuilder();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({
      communityId,
      userId,
      getToken,
    }: RemoveCommunityMemberRequest) => {
      const token = await getToken();

      if (!token) {
        throw new Error("not authenticated");
      }

      await zenaoClient.removeCommunityMember(
        { communityId, userId },
        { headers: buildHeaders(token) },
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(
        communityUsersWithRoles(variables.communityId, ["member"]),
      );
    },
  });

  return {
    removeCommunityMember: mutateAsync,
    isPending,
  };
};
