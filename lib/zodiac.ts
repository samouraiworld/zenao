import { allow } from "zodiac-roles-sdk/kit";
import { processPermissions, planApplyRole } from "zodiac-roles-sdk";

const permissions = [
  allow.basesep.profile.set(),
  allow.basesep.profile.setBatch(),
];

const { targets } = processPermissions(permissions);

export const EventOrganizerRoleKey =
  "0x6576656e745f6f7267616e697a65720000000000000000000000000000000000"; // event_organizer

export const planApplyEventOrganizerRole = async (
  members: `0x${string}`[],
  options: Parameters<typeof planApplyRole>[1],
) => {
  return planApplyRole(
    { key: EventOrganizerRoleKey, targets, members },
    options,
  );
};
