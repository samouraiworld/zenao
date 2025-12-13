// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {TicketMaster, RolesMod, Operation} from "../src/TicketMaster.sol";

contract TicketMasterTest is Test {
    TicketMasterTesting public ticketMaster;

    function setUp() public {
        ticketMaster = new TicketMasterTesting();
    }

    function test_SetCapacity() public {
        ticketMaster.setCapacity(42);
        assertEq(ticketMaster.capacity(address(this)), 42);
    }

    function testFuzz_SetCapacity(uint x) public {
        ticketMaster.setCapacity(x);
        assertEq(ticketMaster.capacity(address(this)), x);
    }

    function test_SetSaleEnd() public {
        uint saleEnd = block.timestamp + 42;

        ticketMaster.setSaleEnd(saleEnd, true);
        assertEq(ticketMaster.sale_end(address(this)), saleEnd);

        assertEq(ticketMaster.discoverableCountTesting(), 1);
        assertEq(ticketMaster.events_by_sale_end(0), address(this));

        ticketMaster.setSaleEnd(saleEnd, false);
        assertEq(ticketMaster.sale_end(address(this)), saleEnd);
        assertEq(ticketMaster.discoverableCountTesting(), 0);
    }

    function testFuzz_SetSaleEnd(
        address eventAddr,
        uint saleEnd,
        bool discoverable
    ) public {
        saleEnd = bound(saleEnd, 1, type(uint).max);

        vm.prank(eventAddr);

        ticketMaster.setSaleEnd(saleEnd, discoverable);
        assertEq(ticketMaster.sale_end(eventAddr), saleEnd);

        if (!discoverable) {
            assertEq(ticketMaster.discoverableCountTesting(), 0);
            return;
        }

        assertEq(ticketMaster.discoverableCountTesting(), 1);
        assertEq(ticketMaster.events_by_sale_end(0), eventAddr);
    }

    function testFuzz_EmitCancelTicket(
        address eventAddr,
        address ownerAddr,
        uint256 ticketPubKey,
        bool discoverable
    ) public {
        ticketPubKey = bound(ticketPubKey, 1, type(uint256).max);
        RolesModMock rolesMod = new RolesModMock();

        vm.startPrank(eventAddr);
        ticketMaster.setCapacity(42);
        ticketMaster.setSaleEnd(block.timestamp + 1, discoverable);
        ticketMaster.setRolesMod(address(rolesMod));
        vm.stopPrank();

        vm.prank(ownerAddr);
        ticketMaster.emitTicket(eventAddr, ticketPubKey);

        vm.prank(ownerAddr);
        ticketMaster.cancelTicket(eventAddr, ticketPubKey);
    }
}

contract TicketMasterTesting is TicketMaster {
    function discoverableCountTesting() public view returns (uint) {
        return events_by_sale_end.length;
    }
}

contract RolesModMock is RolesMod {
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
    ) public returns (bool success) {
        return true;
    }

    /// @dev Assigns and revokes roles to a given module.
    /// @param module Module on which to assign/revoke roles.
    /// @param roleKeys Roles to assign/revoke.
    /// @param memberOf Assign (true) or revoke (false) corresponding roleKeys.
    function assignRoles(
        address module,
        bytes32[] calldata roleKeys,
        bool[] calldata memberOf
    ) public {}
}
