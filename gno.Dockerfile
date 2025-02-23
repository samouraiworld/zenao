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
      ca-certificates

WORKDIR /app
RUN git clone https://github.com/gnolang/gno.git

WORKDIR /app/gno
COPY .gnoversion .gnoversion
RUN git checkout $(cat .gnoversion)

WORKDIR /app/gno/contribs/gnodev
RUN --mount=type=cache,target=/root/.cache/go-build \
  --mount=type=cache,target=/root/go/pkg/mod \
  CGO_ENABLED=0 \
  go build \
  -mod=readonly \
  -o /app/build/gnodev \
  ./cmd/gnodev

WORKDIR /app
COPY gno packages
RUN find packages \( -type d -name .git -prune \) -o -type f -print0 | xargs -0 sed -i "s/g1cjkwzxyzhgd7c0797r7krhqpm84537stmt2x94/${ZENAO_ADMIN_ADDR}/g"
RUN echo "${ZENAO_ADMIN_ADDR}=100000000000ugnot" > genesis_balances.txt


# --------------------------------------------------------
# Runner
# --------------------------------------------------------

FROM ${RUNNER_IMAGE}

COPY --from=builder /app/build/gnodev /bin/gnodev
COPY --from=builder /app/gno /app/gno
COPY --from=builder /app/packages /packages
COPY --from=builder /app/genesis_balances.txt /genesis_balances.txt

ENV HOME=/app
WORKDIR $HOME

ENTRYPOINT ["/bin/gnodev", "staging", "--node-rpc-listener", "0.0.0.0:26657", "--web-listener", "0.0.0.0:8888", "--chain-id", "zenao-dev", "--server-mode", "--balance-file", "/genesis_balances.txt", "/packages"]
