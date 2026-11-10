#!/bin/sh
# Zenao kubo settings. The kubo image runs every /container-init.d/*.sh on each
# container start, so these settings are re-applied on every start.
#
# Zenao runs an isolated node: it stores and serves only the files uploaded
# through the Zenao backend. It does not join the public IPFS network.
set -eu

# A new kubo image may need a newer repo format; "ipfs config" below would
# fail on an old one. No-op when the repo is current.
ipfs repo migrate

# No peer discovery, no content routing, no swarm listener.
ipfs config Routing.Type none
ipfs config --json Bootstrap '[]'
ipfs config --json Addresses.Swarm '[]'
ipfs config --json AutoConf.Enabled false
ipfs config --json DNS.Resolvers '{}'
ipfs config --json Routing.DelegatedRouters '[]'
ipfs config --json Ipns.DelegatedPublishers '[]'
ipfs config --json AutoTLS.Enabled false
ipfs config --json Discovery.MDNS.Enabled false
ipfs config --json Swarm.DisableNatPortMap true
ipfs config --json Swarm.RelayClient.Enabled false
ipfs config --json Swarm.RelayService.Enabled false
ipfs config AutoNAT.ServiceMode disabled
ipfs config --json Provide.Enabled false

# The gateway serves only local content: it never fetches unknown CIDs,
# so it cannot be used as an open public gateway.
ipfs config --json Gateway.NoFetch true
ipfs config --json Gateway.ExposeRoutingAPI false
# Serve /ipfs/<cid> paths only: never resolve the Host header as DNSLink.
ipfs config --json Gateway.NoDNSLink true

# Storage cap. The Zenao backend refuses uploads (HTTP 507) once the repo
# reaches it. Set ZENAO_IPFS_STORAGE_MAX in the compose project .env file.
ipfs config Datastore.StorageMax "${ZENAO_IPFS_STORAGE_MAX:-20GB}"

# Listen on all container interfaces. The compose files publish only the
# gateway, on the host loopback; the RPC API stays on the Docker network.
ipfs config Addresses.API /ip4/0.0.0.0/tcp/5001
ipfs config Addresses.Gateway /ip4/0.0.0.0/tcp/8080
