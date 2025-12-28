import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address, BigInt } from "@graphprotocol/graph-ts"
import { SaleEndSet } from "../generated/schema"
import { SaleEndSet as SaleEndSetEvent } from "../generated/TicketMaster/TicketMaster"
import { handleSaleEndSet } from "../src/ticket-master"
import { createSaleEndSetEvent } from "./ticket-master-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#tests-structure

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let eventAddr = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let saleEnd = BigInt.fromI32(234)
    let discoverable = "boolean Not implemented"
    let newSaleEndSetEvent = createSaleEndSetEvent(
      eventAddr,
      saleEnd,
      discoverable
    )
    handleSaleEndSet(newSaleEndSetEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#write-a-unit-test

  test("SaleEndSet created and stored", () => {
    assert.entityCount("SaleEndSet", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "SaleEndSet",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "eventAddr",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "SaleEndSet",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "saleEnd",
      "234"
    )
    assert.fieldEquals(
      "SaleEndSet",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "discoverable",
      "boolean Not implemented"
    )

    // More assert options:
    // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#asserts
  })
})
