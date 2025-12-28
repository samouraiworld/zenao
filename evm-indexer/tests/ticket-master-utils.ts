import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts"
import {
  SaleEndSet,
  TicketCancelled,
  TicketEmitted
} from "../generated/TicketMaster/TicketMaster"

export function createSaleEndSetEvent(
  eventAddr: Address,
  saleEnd: BigInt,
  discoverable: boolean
): SaleEndSet {
  let saleEndSetEvent = changetype<SaleEndSet>(newMockEvent())

  saleEndSetEvent.parameters = new Array()

  saleEndSetEvent.parameters.push(
    new ethereum.EventParam("eventAddr", ethereum.Value.fromAddress(eventAddr))
  )
  saleEndSetEvent.parameters.push(
    new ethereum.EventParam(
      "saleEnd",
      ethereum.Value.fromUnsignedBigInt(saleEnd)
    )
  )
  saleEndSetEvent.parameters.push(
    new ethereum.EventParam(
      "discoverable",
      ethereum.Value.fromBoolean(discoverable)
    )
  )

  return saleEndSetEvent
}

export function createTicketCancelledEvent(
  eventAddr: Address,
  ticketPubKey: BigInt
): TicketCancelled {
  let ticketCancelledEvent = changetype<TicketCancelled>(newMockEvent())

  ticketCancelledEvent.parameters = new Array()

  ticketCancelledEvent.parameters.push(
    new ethereum.EventParam("eventAddr", ethereum.Value.fromAddress(eventAddr))
  )
  ticketCancelledEvent.parameters.push(
    new ethereum.EventParam(
      "ticketPubKey",
      ethereum.Value.fromUnsignedBigInt(ticketPubKey)
    )
  )

  return ticketCancelledEvent
}

export function createTicketEmittedEvent(
  eventAddr: Address,
  owner: Address,
  ticketPubKey: BigInt
): TicketEmitted {
  let ticketEmittedEvent = changetype<TicketEmitted>(newMockEvent())

  ticketEmittedEvent.parameters = new Array()

  ticketEmittedEvent.parameters.push(
    new ethereum.EventParam("eventAddr", ethereum.Value.fromAddress(eventAddr))
  )
  ticketEmittedEvent.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  )
  ticketEmittedEvent.parameters.push(
    new ethereum.EventParam(
      "ticketPubKey",
      ethereum.Value.fromUnsignedBigInt(ticketPubKey)
    )
  )

  return ticketEmittedEvent
}
