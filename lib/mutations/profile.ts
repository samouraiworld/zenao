import { useMutation } from "@tanstack/react-query";
import { profileOptions } from "../queries/profile";
import { getQueryClient } from "../get-query-client";
import { zenaoClient } from "@/lib/zenao-client";
import { useHeaderBuilder } from "@/hooks/use-header-builder";

interface EditUserProfileRequest {
  displayName: string;
  bio: string;
  avatarUri: string;
  token: string;
  userId: string;
}

export const useEditUserProfile = () => {
  const queryClient = getQueryClient();
  const { buildHeaders } = useHeaderBuilder();

  const { mutateAsync, isPending, isSuccess, isError } = useMutation({
    mutationFn: async ({
      displayName,
      bio,
      avatarUri,
      token,
    }: EditUserProfileRequest) => {
      await zenaoClient.editUser(
        {
          displayName,
          bio,
          avatarUri,
        },
        {
          headers: buildHeaders(token),
        },
      );
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries(profileOptions(variables.userId));
    },
  });

  return {
    editUser: mutateAsync,
    isPending,
    isSuccess,
    isError,
  };
};
