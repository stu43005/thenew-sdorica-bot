FROM node:16-bullseye-slim as build

# Add Tini https://github.com/krallin/tini
RUN set -x \
    && apt-get update \
    && apt-get install tini \
    && rm -rf /var/cache/apt/*

# Create app directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install packages
RUN npm ci

# Copy the app code
COPY . .

# Build the project
RUN npm run build

# Install packages only production dependencies
RUN npm ci --omit=dev

#FROM gcr.io/distroless/nodejs:16
FROM node:16-bullseye

ENV NODE_ENV production

# https://github.com/bytedance/diat
RUN set -x \
    && apt-get update \
    && apt-get install -y linux-perf python \
    && rm -rf /var/cache/apt/* \
    && npm i diat -g

COPY --from=build /usr/bin/tini /usr/bin/tini
COPY --from=build /app /app
WORKDIR /app

# Expose ports
EXPOSE 8080

# Run the application
ENTRYPOINT ["/usr/bin/tini", "--"]
# CMD [ "/nodejs/bin/node", "dist/start-manager.js" ]
CMD [ "node", "dist/start-manager.js" ]
