import { Bytes } from "@graphprotocol/graph-ts"
import {
  SaleEndSet as SaleEndSetEvent,
  TicketCancelled as TicketCancelledEvent,
  TicketEmitted as TicketEmittedEvent,
  CreatorSet as CreatorSetEvent,
  StartDateSet as StartDateSetEvent,
} from "../generated/TicketMaster/TicketMaster"
import { SaleEndSet, TicketCancelled, TicketEmitted, Ticket, Event } from "../generated/schema"

export function handleSaleEndSet(event: SaleEndSetEvent): void {
  let entity = new SaleEndSet(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.eventAddr = event.params.eventAddr
  entity.saleEnd = event.params.saleEnd
  entity.discoverable = event.params.discoverable

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()

  const id = event.params.eventAddr
  let zenaoEvent = Event.load(id)
  if (zenaoEvent == null) {
    zenaoEvent = new Event(id)
    zenaoEvent.eventAddr = event.params.eventAddr
    zenaoEvent.blockNumber = event.block.number
    zenaoEvent.blockTimestamp = event.block.timestamp
    zenaoEvent.transactionHash = event.transaction.hash
  }
  zenaoEvent.discoverable = event.params.discoverable
  zenaoEvent.saleEnd = event.params.saleEnd
  
  zenaoEvent.save()
}

export function handleCreatorSet(event: CreatorSetEvent): void {
  const id = event.params.eventAddr
  let zenaoEvent = Event.load(id)
  if (zenaoEvent == null) {
    return
  }
  zenaoEvent.creatorAddr = event.params.creatorAddr
  zenaoEvent.save()
}

export function handleStartDateSet(event: StartDateSetEvent): void {
  const id = event.params.eventAddr
  let zenaoEvent = Event.load(id)
  if (zenaoEvent == null) {
    return
  }
  zenaoEvent.startDate = event.params.startDate
  zenaoEvent.save()
}

export function handleTicketCancelled(event: TicketCancelledEvent): void {
  let entity = new TicketCancelled(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.eventAddr = event.params.eventAddr
  entity.ticketPubKey = event.params.ticketPubKey

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()

  let ticket = Ticket.load(
    event.params.eventAddr.concat(event.params.ticketPubKey)
  )
  if (!ticket) {
    return
  }
  ticket.deleted = true
  ticket.save()
}

export function handleTicketEmitted(event: TicketEmittedEvent): void {
  let entity = new TicketEmitted(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.eventAddr = event.params.eventAddr
  entity.owner = event.params.owner
  entity.ticketPubKey = event.params.ticketPubKey

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()

  let ticket = new Ticket(
    event.params.eventAddr.concat(event.params.ticketPubKey)
  )
  ticket.eventAddr = event.params.eventAddr
  ticket.owner = event.params.owner
  ticket.ticketPubKey = event.params.ticketPubKey
  ticket.blockNumber = event.block.number
  ticket.blockTimestamp = event.block.timestamp
  ticket.transactionHash = event.transaction.hash
  ticket.deleted = false

  ticket.save()
}
