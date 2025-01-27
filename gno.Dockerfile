# syntax=docker/dockerfile:1

ARG GO_VERSION="1.23"
ARG RUNNER_IMAGE="debian:bookworm"

# --------------------------------------------------------
# Builder
# --------------------------------------------------------

FROM golang:${GO_VERSION}-bookworm AS builder

RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive \
    apt-get install --no-install-recommends --assume-yes \
      build-essential \
      ca-certificates

WORKDIR /app
RUN git clone https://github.com/n0izn0iz/gno.git

WORKDIR /app/gno
RUN git checkout gnodev-server

WORKDIR /app/gno/contribs/gnodev
RUN --mount=type=cache,target=/root/.cache/go-build \
  --mount=type=cache,target=/root/go/pkg/mod \
  CGO_ENABLED=0 \
  go build \
  -mod=readonly \
  -o /app/build/gnodev \
  ./cmd/gnodev

# --------------------------------------------------------
# Runner
# --------------------------------------------------------

FROM ${RUNNER_IMAGE}

COPY --from=builder /app/build/gnodev /bin/gnodev
COPY --from=builder /app/gno /app/gno
COPY gno /gno

ENV HOME=/app
WORKDIR $HOME

ENTRYPOINT ["/bin/gnodev", "--node-rpc-listener", "0.0.0.0:26657", "--web-listener", "0.0.0.0:8888", "--chain-id", "zenao-dev", "--server-mode", "--add-account", "g1m0lplhma8z4uruds4zcltmlgwlht7w739e6qlp=100000000000ugnot", "/gno"]
