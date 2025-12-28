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
        bool discoverable
    ) public {
        RolesModMock rolesMod = new RolesModMock();

        bytes
            memory ticketPubKey = hex"144bfff61dc9fccb596ee85ae84ed844d94e657ddd48a3a32f25c7cf6c7324d3e389aabab089a667ee3753a850ab0d634ac9e0193dbfa8cf922ec53587ef7ab0";

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

    function test_Signature() public {
        address addr = 0xb68b43E56474325f0B7e0FC5ad1869b6E97284f0;

        bytes32 h = 0x13732c556826599ff4d071fd81858cc7c427cf50704d39acbc88f0222355b905;
        assertEq(keccak256(abi.encodePacked(addr)), h, "invalid hash"); // this ensures we get same hash as in javascript

        bytes
            memory ticketPubKey = hex"144bfff61dc9fccb596ee85ae84ed844d94e657ddd48a3a32f25c7cf6c7324d3e389aabab089a667ee3753a850ab0d634ac9e0193dbfa8cf922ec53587ef7ab0";
        assertEq(ticketPubKey.length, 64, "invalid length for pk");

        bytes
            memory signature = hex"a7091182d3095c03a552a28a2070ab44ea67a60c5393253a521301db7f8fab9134f404efd916efd3141d9be89e69f8e3f826797a6d0d4cb76025b201be7bd876";
        assertEq(signature.length, 64, "invalid length for sig");

        bytes32 qx;
        assembly {
            qx := mload(add(ticketPubKey, 0x20))
        }
        assertEq(
            uint256(qx),
            9180537082126167592233666925496709969015080171904535570456332917295117706451,
            "invalid qx"
        );

        bytes32 qy;
        assembly {
            qy := mload(add(ticketPubKey, 0x40))
        }
        assertEq(
            uint256(qy),
            102918253006296732568612546013345523315573583013021682549405935992937494051504,
            "invalid qy"
        );

        bytes32 r;
        assembly {
            r := mload(add(signature, 0x20))
        }
        assertEq(
            uint256(r),
            75552268193694198274983563347751717264334617307642003969435952901866625411985,
            "invalid r"
        );

        /*
        bytes32 s;
        assembly {
            s := mload(add(signature, 0x40))
        }
        assertEq(
            uint256(s),
            91840676326945627229311750599348318376809269698616025652713944151637912669403,
            "invalid s"
        );
        */

        assertTrue(
            ticketMaster.verify(ticketPubKey, signature, h),
            "can't verify signature"
        );

        /*
        assertEq(
            verifier.verify(ticketPubKey, h, signature),
            IERC7913SignatureVerifier.verify.selector,
            "invalid signature"
        );
        */
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
