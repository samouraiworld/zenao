import { usePlausible } from "next-plausible";
import { OrgType } from "@/lib/organization";

type AnalyticEvents = {
  EventParticipation: { eventId: string; guestMode: boolean };
  EventParticipationCanceled: { eventId: string };
  EventCreated: { eventId: string };
  EventCanceled: { eventId: string };
  InstallPwaClick: never;
  SignUpClick: never;
  SignInClick: never;
  ThemeChange: { theme: "light" | "dark" | "system" };
  ProfileEdited: never;
  CommunityEdited: { communityId: string };
  JoinCommunity: { communityId: string };
  LeaveCommunity: { communityId: string };
  PortfolioItemAdded: {
    orgType: OrgType;
    orgId: string;
    itemType: "photo" | "video" | "audio";
  };
  PostSent: { orgType: OrgType; orgId: string };
  PostDeleted: { orgType: OrgType; orgId: string };
  PostReaction: { orgType: OrgType; orgId: string };
  PostCommented: { orgType: OrgType; orgId: string; postId: string };
};

export function useAnalyticsEvents() {
  const plausible = usePlausible<AnalyticEvents>();

  return plausible;
}
