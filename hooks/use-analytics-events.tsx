import { usePlausible } from "next-plausible";
import { OrgType } from "@/lib/organization";

type AnalyticEvents = {
  EventParticipation: { eventId: string; method: "guest" | "loggedIn" };
  EventParticipationCanceled: { eventId: string };
  EventCreated: { eventId: string };
  EventEdited: { eventId: string };
  EventCanceled: { eventId: string };
  EventCheckIn: { eventId: string };
  EventEmailBroadcasted: { eventId: string };
  EventGatekeepersUpdated: { eventId: string };
  InstallPwaClick: never;
  SignUpClick: never;
  SignInClick: never;
  ThemeChange: { theme: "light" | "dark" | "system" };
  UserProfileEdited: never;
  CommunityEdited: { communityId: string };
  CommunityJoined: { communityId: string };
  CommunityLeft: { communityId: string };
  PortfolioUpdated: {
    orgType: OrgType | "user";
    orgId: string;
    itemType: "image" | "video" | "audio";
  };
  PostSent: { orgType: OrgType; orgId: string };
  PostDeleted: { orgType: OrgType; orgId: string };
  PostReaction: { orgType: OrgType; orgId: string };
  PostCommented: { orgType: OrgType; orgId: string; postId: string };
};

export function useAnalyticsEvents() {
  const plausible = usePlausible<AnalyticEvents>();

  return { trackEvent: plausible };
}
