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
      libsqlite3-dev

# Download go dependencies
WORKDIR /app
COPY go.* ./
RUN --mount=type=cache,target=/root/.cache/go-build \
  --mount=type=cache,target=/root/go/pkg/mod \
  go mod download

# Copy the remaining files
COPY backend ./backend
COPY .git ./.git

# Build binary
RUN --mount=type=cache,target=/root/.cache/go-build \
  --mount=type=cache,target=/root/go/pkg/mod \
  go build \
  -mod=readonly \
  -o /app/build/zenao-backend \
  ./backend

# --------------------------------------------------------
# Runner
# --------------------------------------------------------

FROM ${RUNNER_IMAGE}

RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive \
    apt-get install --no-install-recommends --assume-yes \
      libsqlite3-dev \
      ca-certificates

COPY --from=builder /app/build/zenao-backend /bin/zenao-backend

ENV HOME=/app
WORKDIR $HOME

ENTRYPOINT ["/bin/zenao-backend", "start", "--bind-addr", "0.0.0.0:4242", "--gno-chain-id", "zenao-dev"]
