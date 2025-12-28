// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/cryptography/verifiers/ERC7913P256Verifier.sol";
import {P256} from "@openzeppelin/contracts/utils/cryptography/P256.sol";

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
    mapping(address => mapping(bytes ticketPubKey => bool)) tickets;
    mapping(address => uint256) public sold_tickets;
    mapping(address => uint256) public checkins;
    mapping(address => uint) public sale_end;
    mapping(address => address) public roles_mod;
    mapping(address => address) public creator;
    mapping(address => mapping(bytes ticketPubKey => address))
        public ticket_owner;
    mapping(address => mapping(address owner => bytes)) public ticket_by_owner;
    address[] public events_by_sale_end;
    ERC7913P256Verifier verifier;

    event SaleEndSet(address eventAddr, uint saleEnd, bool discoverable);
    event CreatorSet(address eventAddr, address creatorAddr);
    event TicketEmitted(address eventAddr, address owner, bytes ticketPubKey);
    event TicketCancelled(address eventAddr, bytes ticketPubKey);
    event StartDateSet(address eventAddr, uint startDate);

    // TODO: consider using openzepelin Ownable instead of manager

    // TODO: make this upgradable

    constructor() {
        verifier = new ERC7913P256Verifier();
    }

    function emitTicket(address eventAddr, bytes calldata ticketPubKey) public {
        require(roles_mod[eventAddr] != address(0), "no such event");
        require(sale_end[eventAddr] > block.timestamp, "sale ended");
        require(sold_tickets[eventAddr] < capacity[eventAddr], "sold out");
        require(
            !tickets[eventAddr][ticketPubKey],
            "ticket public key already used"
        );
        require(ticketPubKey.length == 64, "ticket pubkey must be 64 bytes");
        require(
            ticket_by_owner[eventAddr][msg.sender].length == 0,
            "owner already has a ticket"
        );
        require(sale_end[eventAddr] != 0, "sale end not set");

        // TODO: participation password

        tickets[eventAddr][ticketPubKey] = true;
        sold_tickets[eventAddr]++;
        ticket_owner[eventAddr][ticketPubKey] = msg.sender;
        ticket_by_owner[eventAddr][msg.sender] = ticketPubKey;

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

        emit TicketEmitted(eventAddr, msg.sender, ticketPubKey);
    }

    function cancelTicket(
        address eventAddr,
        bytes calldata ticketPubKey
    ) public onlyRegisteredTicket(eventAddr, ticketPubKey) {
        require(
            ticket_owner[eventAddr][ticketPubKey] == msg.sender,
            "only ticket owner can cancel a ticket"
        );

        delete tickets[eventAddr][ticketPubKey];
        sold_tickets[eventAddr]--;
        delete ticket_owner[eventAddr][ticketPubKey];
        delete ticket_by_owner[eventAddr][msg.sender];

        bytes32[] memory roles = new bytes32[](1);
        roles[0] = "participant";
        bool[] memory assign = new bool[](1);
        assign[0] = false;
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
            "failed to remove participant role"
        );

        emit TicketCancelled(eventAddr, ticketPubKey);
    }

    function checkin(
        address gatekeeper,
        bytes calldata ticketPubKey,
        bytes calldata signature
    ) public onlyRegisteredTicket(msg.sender, ticketPubKey) {
        require(
            verifier.verify(
                ticketPubKey,
                keccak256(abi.encodePacked(gatekeeper)),
                signature
            ) == IERC7913SignatureVerifier.verify.selector,
            "invalid signature"
        );

        delete tickets[msg.sender][ticketPubKey];
        checkins[msg.sender]++; // should this only emit an event and be counted offchain?
        // TODO: emit event?
    }

    function verify(
        bytes calldata key,
        bytes calldata signature,
        bytes32 h
    ) public view returns (bool) {
        bytes32 qx = bytes32(key[0x00:0x20]);
        bytes32 qy = bytes32(key[0x20:0x40]);
        bytes32 r = bytes32(signature[0x00:0x20]);
        bytes32 s = bytes32(signature[0x20:0x40]);
        return P256.verify(h, r, s, qx, qy);
    }

    function setCapacity(uint256 newCapacity) public {
        require(
            newCapacity >= sold_tickets[msg.sender],
            "new capacity is less than the number of tickets sold"
        );

        capacity[msg.sender] = newCapacity;
        // TODO: emit event?
    }

    function queryEvents(
        uint from,
        uint to,
        uint limit
    ) public view returns (address[] memory res) {
        if (from <= to) {
            return res;
        }
        uint left = searchInsert(from);
        uint right = searchInsert(to);
        for (
            ;
            left > 0 && sale_end[events_by_sale_end[left - 1]] == from;
            left--
        ) {
            // iterate
        }
        for (
            ;
            right < events_by_sale_end.length - 1 &&
                sale_end[events_by_sale_end[right + 1]] == to;
            right++
        ) {
            // iterate
        }
        uint cap = right - left;
        if (cap > limit) {
            cap = limit;
        }
        res = new address[](cap);
        for (uint i = 0; i < cap; i++) {
            res[i] = events_by_sale_end[left + i];
        }
    }

    function queryEventsReverse(
        uint from,
        uint to,
        uint limit
    ) public view returns (address[] memory res) {
        if (from >= to) {
            return res;
        }
        uint left = searchInsert(to);
        uint right = searchInsert(from);
        for (
            ;
            left > 0 && sale_end[events_by_sale_end[left - 1]] == to;
            left--
        ) {
            // iterate
        }
        for (
            ;
            right < events_by_sale_end.length - 1 &&
                sale_end[events_by_sale_end[right + 1]] == from;
            right++
        ) {
            // iterate
        }
        uint cap = right - left;
        if (cap > limit) {
            cap = limit;
        }
        res = new address[](cap);
        for (uint i = 0; i < cap; i++) {
            res[i] = events_by_sale_end[right - i - 1];
        }
    }

    function setSaleEnd(uint newSaleEnd, bool discoverable) public {
        require(newSaleEnd != 0, "new sale end must not be zero");

        // remove previous
        uint previousSaleEnd = sale_end[msg.sender];
        if (previousSaleEnd != 0) {
            uint index;
            for (
                ;
                index < events_by_sale_end.length &&
                    events_by_sale_end[index] != msg.sender;
                index++
            ) {
                // iterate
            }
            for (uint i = index; i < events_by_sale_end.length - 1; i++) {
                events_by_sale_end[i] = events_by_sale_end[i + 1];
            }
            events_by_sale_end.pop();
        }

        if (discoverable) {
            // insert new
            uint nextPos = searchInsert(newSaleEnd);
            events_by_sale_end.push(address(0));
            for (uint i = nextPos; i < events_by_sale_end.length - 1; i++) {
                events_by_sale_end[i + 1] = events_by_sale_end[i];
            }
            events_by_sale_end[nextPos] = msg.sender;
        }

        sale_end[msg.sender] = newSaleEnd;

        emit SaleEndSet(msg.sender, newSaleEnd, discoverable);
    }

    function setRolesMod(address newRolesMode) public {
        roles_mod[msg.sender] = newRolesMode;
        // TODO: emit event?
    }

    function setCreator(address creatorAddr) public {
        creator[msg.sender] = creatorAddr;
        emit CreatorSet(msg.sender, creatorAddr);
    }

    function setStartDate(uint startDate) public {
        // this is used to index events by startDate
        emit StartDateSet(msg.sender, startDate);
    }

    modifier onlyRegisteredTicket(address owner, bytes calldata ticketPubKey) {
        require(tickets[owner][ticketPubKey], "no such ticket");
        _;
    }

    // TODO: query events

    function searchInsert(uint target) private view returns (uint left) {
        uint right = events_by_sale_end.length;
        for (; left < right; ) {
            uint mid = left + (right - left) / 2;
            if (target > sale_end[events_by_sale_end[mid]]) {
                left = mid + 1;
            } else {
                right = mid;
            }
        }
        return left;
    }

    function searchInsertFind(
        uint target,
        address eventAddr
    ) private view returns (uint left) {
        left = searchInsert(target);

        uint oleft = left;

        // find event by address
        for (
            ;
            left > 0 &&
                events_by_sale_end[left] != eventAddr &&
                sale_end[events_by_sale_end[left - 1]] == target;
            left--
        ) {
            // iterate left
        }

        left = oleft;
        for (
            ;
            left < events_by_sale_end.length - 1 &&
                events_by_sale_end[left] != eventAddr &&
                sale_end[events_by_sale_end[left + 1]] == target;
            left++
        ) {
            // iterate right
        }
    }
}
