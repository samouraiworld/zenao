// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

enum Operation {
    Call,
    DelegateCall
}

interface RolesMod {
    /// @dev Passes a transaction to the modifier assuming the specified role.
    /// @param to Destination address of module transaction
    /// @param value Ether value of module transaction
    /// @param data Data payload of module transaction
    /// @param operation Operation type of module transaction
    /// @param roleKey Identifier of the role to assume for this transaction
    /// @param shouldRevert Should the function revert on inner execution returning success false?
    /// @notice Can only be called by enabled modules
    function execTransactionWithRole(
        address to,
        uint256 value,
        bytes calldata data,
        Operation operation,
        bytes32 roleKey,
        bool shouldRevert
    ) external returns (bool success);

    /// @dev Assigns and revokes roles to a given module.
    /// @param module Module on which to assign/revoke roles.
    /// @param roleKeys Roles to assign/revoke.
    /// @param memberOf Assign (true) or revoke (false) corresponding roleKeys.
    function assignRoles(
        address module,
        bytes32[] calldata roleKeys,
        bool[] calldata memberOf
    ) external;
}

contract TicketMaster {
    mapping(address => uint256) public capacity;
    mapping(address => mapping(uint256 ticketPubKey => bool)) tickets;
    mapping(address => uint256) public sold_tickets;
    mapping(address => uint256) public checkins;
    mapping(address => uint) public sale_end;
    mapping(address => address) public roles_mod;

    // TODO: consider using openzepelin Ownable instead of manager

    // TODO: make this upgradable

    function emitTicket(address eventAddr, uint256 ticketPubKey) public {
        require(roles_mod[eventAddr] != address(0), "no such event");
        require(sale_end[eventAddr] > block.timestamp, "sale ended");
        require(sold_tickets[eventAddr] < capacity[eventAddr], "sold out");
        require(
            !tickets[eventAddr][ticketPubKey],
            "ticket public key already used"
        );

        // XXX: participation password
        // For now this validation can be done fully off-chain since an user can't participate in a permissionless way
        // if we support permissionless participation for free and on-chain payment events, revisit

        tickets[eventAddr][ticketPubKey] = true;
        sold_tickets[eventAddr]++;

        bytes32[] memory roles = new bytes32[](1);
        roles[0] = "participant";
        bool[] memory assign = new bool[](1);
        assign[0] = true;
        RolesMod rmod = RolesMod(roles_mod[eventAddr]);
        require(
            rmod.execTransactionWithRole(
                roles_mod[eventAddr],
                0,
                abi.encodeCall(
                    RolesMod.assignRoles,
                    (msg.sender, roles, assign)
                ), // participant role key
                Operation.Call,
                "tickets_master", // tickets_master
                true
            ),
            "failed to add participant role"
        );
        // TODO: emit event?
    }

    function cancelTicket(
        uint256 ticketPubKey
    ) public onlyRegisteredTicket(ticketPubKey) {
        delete tickets[msg.sender][ticketPubKey];
        sold_tickets[msg.sender]--;

        // TODO: make it permissionless and revoke participant role

        // TODO: emit event?
    }

    function checkin(
        uint256 ticketPubKey
    ) public onlyRegisteredTicket(ticketPubKey) {
        // TODO: validate signature

        delete tickets[msg.sender][ticketPubKey];
        checkins[msg.sender]++; // should this only emit an event and be counted offchain?
        // TODO: emit event?
    }

    function setCapacity(uint256 newCapacity) public {
        require(
            newCapacity >= sold_tickets[msg.sender],
            "new capacity is less than the number of tickets sold"
        );

        capacity[msg.sender] = newCapacity;
        // TODO: emit event?
    }

    function setSaleEnd(uint newSaleEnd) public {
        sale_end[msg.sender] = newSaleEnd;
        // TODO: emit event?
    }

    function setRolesMod(address newRolesMode) public {
        roles_mod[msg.sender] = newRolesMode;
        // TODO: emit event?
    }

    modifier onlyRegisteredTicket(uint256 ticketPubKey) {
        require(tickets[msg.sender][ticketPubKey], "no such ticket");
        _;
    }
}
