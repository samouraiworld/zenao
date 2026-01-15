import { useMutation } from "@tanstack/react-query";
import { getQueryClient } from "../get-query-client";
import { GetToken } from "../utils";
import { zenaoClient } from "../zenao-client";

interface EditTeamRequest {
  userId: string;
  displayName: string;
  avatarUri: string;
  bio: string;
  members: string[]; // Ids or emails
}

export const useEditTeam = (getToken: GetToken) => {
  const queryClient = getQueryClient();

  const { mutateAsync, isPending, isSuccess, isError } = useMutation({
    mutationFn: async ({
      displayName,
      avatarUri,
      bio,
      members,
    }: EditTeamRequest) => {
      const token = await getToken();

      if (!token) {
        throw new Error("invalid clerk token");
      }

      await zenaoClient.editTeam(
        { displayName, avatarUri, bio, members },
        { headers: { Authorization: "Bearer " + token } },
      );
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["userTeams", variables.userId],
      });
    },
  });

  return {
    editTeam: mutateAsync,
    isPending,
    isSuccess,
    isError,
  };
};
