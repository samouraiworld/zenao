# syntax=docker/dockerfile:1

ARG GO_VERSION="1.23"
ARG RUNNER_IMAGE="debian:bookworm"

# --------------------------------------------------------
# Builder
# --------------------------------------------------------

FROM golang:${GO_VERSION}-bookworm AS builder

ARG ZENAO_ADMIN_ADDR="g1cjkwzxyzhgd7c0797r7krhqpm84537stmt2x94"

RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive \
    apt-get install --no-install-recommends --assume-yes \
      build-essential \
      ca-certificates \
      curl

WORKDIR /app
RUN git clone https://github.com/gnolang/gno.git

WORKDIR /app/gno
COPY .gnoversion .gnoversion
RUN git checkout $(cat .gnoversion)

WORKDIR /app/gno
RUN --mount=type=cache,target=/root/.cache/go-build \
  --mount=type=cache,target=/root/go/pkg/mod \
  CGO_ENABLED=0 \
  go build \
  -mod=readonly \
  -o /app/build/gnoweb \
  ./gno.land/cmd/gnoweb

# --------------------------------------------------------
# Runner
# --------------------------------------------------------

FROM ${RUNNER_IMAGE}

COPY --from=builder /app/build/gnoweb /bin/gnoweb

ENV HOME=/app
WORKDIR $HOME

ENTRYPOINT exec gnoweb -remote $GNOWEB_REMOTE -chainid $GNO_CHAIN_ID -help-remote $GNOWEB_HELP_REMOTE
