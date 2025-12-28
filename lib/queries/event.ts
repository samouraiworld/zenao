import { queryOptions } from "@tanstack/react-query";
import { fromJson } from "@bufbuild/protobuf";
import { createPublicClient, http } from "viem";
import { gql } from "urql";
import z from "zod";
import { withSpan } from "../tracer";
import { deserializeWithFrontMatter } from "../serialization";
import { ticketMasterABI, ticketMasterAddress } from "../evm";
import { profileOptions } from "./profile";
import { eventUsersWithRole } from "./event-users";
import { evmListEventSchema, ticketMasterGraphClient } from "./events-list";
import { GetToken } from "@/lib/utils";
import {
  EventInfo,
  EventInfoJson,
  EventInfoSchema,
  EventLocationJson,
  GetEventGatekeepersResponse,
} from "@/app/gen/zenao/v1/zenao_pb";
import { zenaoClient } from "@/lib/zenao-client";
import { eventDetailsSchema, ZodLocation } from "@/types/schemas";

const zodLocationToZenaoLocation = (loc: ZodLocation): EventLocationJson => {
  switch (loc.kind) {
    case "custom":
      return { custom: { timezone: loc.timeZone, address: loc.address } };
    case "virtual":
      return { virtual: { uri: loc.location } };
    case "geo":
      return { geo: { lat: loc.lat, lng: loc.lng, address: loc.address } };
  }
};

export const eventOptions = (id: string) =>
  queryOptions({
    queryKey: ["event", id],
    queryFn: async ({ client }) => {
      return withSpan(`query:chain:event:${id}`, async () => {
        const profileQuery = async () => {
          const profile = await client.fetchQuery(profileOptions(id));
          console.log("event profile", profile);
          let bio = "";
          if (profile?.bio.startsWith("ipfs://")) {
            try {
              const web2URI = `https://${process.env.NEXT_PUBLIC_GATEWAY_URL}/ipfs/${profile?.bio.substring(7)}`;
              console.log("fetching", web2URI);
              const res = await fetch(web2URI);
              console.log("res", res);
              const body = await res.text();
              bio = body;
            } catch (err) {
              console.warn("failed to get event bio", err);
            }
          }

          const eventDetails = deserializeWithFrontMatter({
            serialized: bio,
            schema: eventDetailsSchema,
            contentFieldName: "bio",
            defaultValue: {
              location: { kind: "virtual", location: "" },
              bio: "",
              startDate: "",
              endDate: "",
              discoverable: true,
            },
          });

          return { profile, eventDetails };
        };

        const evmClient = createPublicClient({
          transport: http(process.env.NEXT_PUBLIC_EVM_RPC),
        });

        const capQuery = async () => {
          const capacity = await evmClient.readContract({
            abi: ticketMasterABI,
            address: ticketMasterAddress,
            functionName: "capacity",
            args: [id as `0x${string}`],
          });
          return capacity;
        };

        const participantsQuery = async () => {
          const participants = await evmClient.readContract({
            abi: ticketMasterABI,
            address: ticketMasterAddress,
            functionName: "sold_tickets",
            args: [id as `0x${string}`],
          });
          return participants;
        };

        const organizersQuery = async () => {
          const organizers = await client.fetchQuery(
            eventUsersWithRole(id, "organizer"),
          );
          return organizers;
        };

        const discoverableQuery = async () => {
          const query = gql`
          {
            event(
              id: ${JSON.stringify(id)}
            ) {
              discoverable
            }
          }
        `;

          const result = await ticketMasterGraphClient
            .query(query, {})
            .toPromise();

          console.log("events list", result.data);

          const parsedListEvent = z
            .object({ event: z.object({ discoverable: z.boolean() }) })
            .parse(result.data).event;

          return parsedListEvent.discoverable;
        };

        const [profile, capacity, participants, organizers, discoverable] =
          await Promise.all([
            profileQuery(),
            capQuery(),
            participantsQuery(),
            organizersQuery(),
            discoverableQuery(),
          ]);

        const info: EventInfo = fromJson(EventInfoSchema, {
          title: profile.profile?.displayName || "",
          description: profile.eventDetails.bio || "",
          imageUri: profile.profile?.avatarUri || "",
          location: zodLocationToZenaoLocation(profile.eventDetails.location),
          startDate: profile.eventDetails.startDate,
          endDate: profile.eventDetails.endDate,
          privacy: { public: {} },
          organizers,
          participants: Number(participants),
          capacity: Number(capacity),
          discoverable,
        } satisfies EventInfoJson);
        return info;
      });
    },
    staleTime: Infinity,
  });

export const eventGatekeepersEmails = (eventId: string, getToken: GetToken) =>
  queryOptions({
    queryKey: ["event", eventId, "gatekeepers"],
    queryFn: async () => {
      return withSpan(
        `query:backend:event:${eventId}:gatekeepers`,
        async () => {
          return {
            $typeName: "zenao.v1.GetEventGatekeepersResponse",
            gatekeepers: [],
          } satisfies GetEventGatekeepersResponse;

          const token = await getToken();

          if (!token) {
            throw new Error("not authenticated");
          }

          const data = await zenaoClient.getEventGatekeepers(
            {
              eventId,
            },
            { headers: { Authorization: `Bearer ${token}` } },
          );

          return data;
        },
      );
    },
  });

export function eventIdFromPkgPath(pkgPath: string): string {
  const res = /(e\d+)$/.exec(pkgPath);
  return res?.[1].substring(1) || "";
}
