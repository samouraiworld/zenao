import { allow } from "zodiac-roles-sdk/kit";
import {
  processPermissions,
  planApplyRole,
  planApply,
  Role,
  FunctionPermission,
} from "zodiac-roles-sdk";

// Event Organizer

export const EventOrganizerRoleKey =
  "0x6f7267616e697a65720000000000000000000000000000000000000000000000"; // organizer

const organizerPermissions = [
  allow.basesep.profile.set(),
  allow.basesep.profile.setBatch(),
  allow.basesep.ticketMaster.setCapacity(),
  allow.basesep.ticketMaster.setSaleEnd(),
  allow.basesep.ticketMaster.checkin(),
  allow.basesep.ticketMaster.setRolesMod(),
  allow.basesep.ticketMaster.cancelTicket(),
  allow.basesep.ticketMaster.setCreator(),
  allow.basesep.ticketMaster.setStartDate(),
];

const { targets: organizerTargets } = processPermissions(organizerPermissions);

export const planApplyEventOrganizerRole = async (
  members: `0x${string}`[],
  options: Parameters<typeof planApplyRole>[1],
) => {
  return planApplyRole(
    { key: EventOrganizerRoleKey, targets: organizerTargets, members },
    options,
  );
};

// Event Gatekeeper

export const EventGatekeeperRoleKey =
  "0x676174656b656570657200000000000000000000000000000000000000000000"; // gatekeeper

const gatekeeperPermissions = [allow.basesep.ticketMaster.checkin()];

const { targets: gatekeeperTargets } = processPermissions(
  gatekeeperPermissions,
);

export const planApplyEventGatekeeperRole = async (
  members: `0x${string}`[],
  options: Parameters<typeof planApplyRole>[1],
) => {
  return planApplyRole(
    { key: EventGatekeeperRoleKey, targets: gatekeeperTargets, members },
    options,
  );
};

// Event Tickets Manager

export const EventTicketsManagerRoleKey =
  "0x7469636b6574735f6d616e616765720000000000000000000000000000000000"; // tickets_manager

const ticketsManagerPermissions = [allow.basesep.ticketMaster.cancelTicket()];

const { targets: ticketsManagerTargets } = processPermissions(
  ticketsManagerPermissions,
);

export const planApplyEventTicketsManagerRole = async (
  members: `0x${string}`[],
  options: Parameters<typeof planApplyRole>[1],
) => {
  return planApplyRole(
    {
      key: EventTicketsManagerRoleKey,
      targets: ticketsManagerTargets,
      members,
    },
    options,
  );
};

// Event Tickets Master

// TODO: how to setup permissions for dynamic roles mod addr since it requires a fixed address at generation

export const EventTicketsMasterRoleKey =
  "0x7469636b6574735f6d6173746572000000000000000000000000000000000000"; // tickets_master

// Event Participant

export const EventParticipantRoleKey =
  "0x7061727469636970616e74000000000000000000000000000000000000000000"; // participant

const { targets: participantTargets } = processPermissions([]);

// all

interface EventRolesConfig {
  rolesModAddr: `0x${string}`;
  organizers: `0x${string}`[];
  gatekeepers: `0x${string}`[];
  ticketsManagers: `0x${string}`[];
  ticketsMaster: `0x${string}`;
}

export const planApplyEventRoles = async (
  conf: EventRolesConfig,
  options: Parameters<typeof planApply>[1],
) => {
  const setParticipantPerm = {
    signature: `function assignRoles(
        address module,
        bytes32[] calldata roleKeys,
        bool[] calldata memberOf
    )`,
    targetAddress: conf.rolesModAddr,
  } satisfies FunctionPermission;

  const { targets: ticketsMasterTargets } = processPermissions([
    setParticipantPerm,
  ]);

  // const ticketsMasterPermissions = ???
  const roles: Role[] = [
    {
      key: EventOrganizerRoleKey,
      targets: organizerTargets,
      members: conf.organizers,
      annotations: [],
      lastUpdate: 0,
    },
    {
      key: EventGatekeeperRoleKey,
      targets: gatekeeperTargets,
      members: conf.gatekeepers,
      annotations: [],
      lastUpdate: 0,
    },
    {
      key: EventTicketsManagerRoleKey,
      targets: ticketsManagerTargets,
      members: conf.ticketsManagers,
      annotations: [],
      lastUpdate: 0,
    },
    {
      key: EventTicketsMasterRoleKey,
      targets: ticketsMasterTargets,
      members: [conf.ticketsMaster],
      annotations: [],
      lastUpdate: 0,
    },
    {
      key: EventParticipantRoleKey,
      targets: participantTargets,
      members: [],
      annotations: [],
      lastUpdate: 0,
    },
  ];

  return planApply({ roles }, options);
};
