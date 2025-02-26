ARG NODE_VERSION=22.14.0

FROM node:${NODE_VERSION}-alpine AS base

# Install pnpm
RUN npm install -g pnpm

# Drop privileges and become the node user
USER node
WORKDIR /usr/src/app

FROM base AS prod-deps

# Install dependencies
COPY ./package.json ./pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts --prod

FROM base AS build

# Add the rest of the application
ADD --chown=node:node . .

# Copy dependencies from deps stage
COPY --from=prod-deps --chown=node:node /usr/src/app/node_modules ./node_modules

RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm run build

FROM base AS runner
 
# Copy dependencies from deps stage
COPY --from=prod-deps /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/build ./build

ENTRYPOINT ["node", "./build/bin/chadgpt.js"]
