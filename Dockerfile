# syntax=docker/dockerfile:1.7-labs
FROM node:22-bookworm AS base

WORKDIR /app

USER root

RUN apt-get update && \
	apt-get install -y dumb-init

COPY package.json package-lock.json /app/
RUN npm install --audit=false --fund=false --omit dev


#
# build the app
#
FROM base AS builder

COPY . /app/

RUN npm install --audit=false --fund=false
RUN npm run build

#
# runner
#
FROM gcr.io/distroless/nodejs22-debian12:latest AS runner

ARG COMMIT="(not set)"
ARG LASTMOD="(not set)"
ENV COMMIT=$COMMIT
ENV LASTMOD=$LASTMOD
ENV NODE_ENV=production

USER nonroot
COPY --chown=nonroot:nonroot --from=base /usr/bin/dumb-init /usr/bin/dumb-init
COPY --chown=nonroot:nonroot --from=base /app/node_modules /app/node_modules
COPY --chown=nonroot:nonroot --from=builder /app/dist /app/dist
COPY --chown=nonroot:nonroot --exclude=src . /app

WORKDIR /app
ENV PORT 5000
ENV HOSTNAME 0.0.0.0
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["/nodejs/bin/node", "dist/server.js"]