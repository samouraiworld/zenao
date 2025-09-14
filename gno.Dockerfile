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
  -o /app/build/gnoland \
  ./gno.land/cmd/gnoland

WORKDIR /app/gno/contribs/gnogenesis
RUN --mount=type=cache,target=/root/.cache/go-build \
  --mount=type=cache,target=/root/go/pkg/mod \
  CGO_ENABLED=0 \
  go build \
  -mod=readonly \
  -o /app/build/gnogenesis \
  .

WORKDIR /app
COPY gno packages
RUN find packages \( -type d -name .git -prune \) -o -type f -print0 | xargs -0 sed -i "s/g1cjkwzxyzhgd7c0797r7krhqpm84537stmt2x94/${ZENAO_ADMIN_ADDR}/g"
RUN mv packages/p /app/gno/examples/gno.land/p/zenao
RUN mv packages/r /app/gno/examples/gno.land/r/zenao

RUN /app/build/gnogenesis generate

RUN echo "${ZENAO_ADMIN_ADDR}=100000000000ugnot" > genesis_balances.txt
RUN echo "g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5=100000000000ugnot" >> genesis_balances.txt
RUN echo "g1cjkwzxyzhgd7c0797r7krhqpm84537stmt2x94=100000000000ugnot" >> genesis_balances.txt
RUN /app/build/gnogenesis balances add --balance-sheet genesis_balances.txt

RUN /app/build/gnogenesis txs add packages /app/gno/examples

COPY genesis_txs.jsonl /app/genesis_txs.jsonl
RUN /app/build/gnogenesis txs add sheets genesis_txs.jsonl

RUN /app/build/gnoland secrets init
RUN /app/build/gnogenesis validator add --address `/app/build/gnoland secrets get --raw validator_key.address` --pub-key `/app/build/gnoland secrets get --raw validator_key.pub_key` --name zenao-val-1

RUN /app/build/gnoland config init
RUN /app/build/gnoland config set rpc.laddr tcp://0.0.0.0:26657
RUN /app/build/gnoland config set p2p.pex false

# --------------------------------------------------------
# Runner
# --------------------------------------------------------

FROM ${RUNNER_IMAGE}

COPY --from=ghcr.io/tarampampam/curl:8.6.0 /bin/curl /bin/curl
COPY --from=builder /app/build/gnoland /bin/gnoland
COPY --from=builder /app/gno /app/gno
COPY --from=builder /app/genesis.json /app/genesis.json
COPY --from=builder /app/gnoland-data /app/gnoland-data

ENV HOME=/app
WORKDIR $HOME

ENTRYPOINT exec gnoland start --lazy
