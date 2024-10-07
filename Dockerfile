FROM node:20-bullseye@sha256:80234aa9669e62c1fb47780d96128127c96fed663bd17dfacfe7bf9e5473884c as build

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

FROM gcr.io/distroless/nodejs20-debian12:latest@sha256:2818fb8cdc25894d9c6b6e6bf72b4033d949f5d6d65173a6d7aeec0266f03037

ENV NODE_ENV production

COPY --from=build /usr/bin/tini /usr/bin/tini
COPY --from=build /app /app
WORKDIR /app

# Expose ports
EXPOSE 8080

# Run the application
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD [ "/nodejs/bin/node", "dist/start-manager.js" ]
