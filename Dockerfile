ARG NODE_VERSION=22.13.1

FROM node:${NODE_VERSION}-alpine AS deps

# Install pnpm
RUN npm install -g pnpm

# Drop privileges and become the node user
USER node
WORKDIR /usr/src/app

# Install dependencies
COPY ./package.json ./pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts --prod

FROM node:${NODE_VERSION}-alpine

# Drop privileges and become the node user
USER node
WORKDIR /usr/src/app
 
# Copy dependencies from deps stage
COPY --from=deps /usr/src/app/node_modules ./node_modules

# Add the rest of the application
ADD . .

ENTRYPOINT ["node", "bin/chadgpt.js"]
