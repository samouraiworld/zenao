import { useMutation } from "@tanstack/react-query";
import { profileOptions } from "../queries/profile";
import { getQueryClient } from "../get-query-client";
import { zenaoClient } from "@/lib/zenao-client";

interface EditUserProfileRequest {
  displayName: string;
  bio: string;
  avatarUri: string;
  token: string;
  address: string;
}

export const useEditUserProfile = () => {
  const queryClient = getQueryClient();
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
          headers: { Authorization: "Bearer " + token },
        },
      );
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries(profileOptions(variables.address));
    },
  });

  return {
    editUser: mutateAsync,
    isPending,
    isSuccess,
    isError,
  };
};
