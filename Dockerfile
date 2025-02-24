ARG BUN_VERSION=1.2-distroless

FROM oven/bun:${BUN_VERSION} AS deps

# Drop privileges and become the bun user
USER nonroot
WORKDIR /usr/src/app

# Install dependencies
COPY ./package.json ./bun.lock ./
RUN ["bun", "install", "--frozen-lockfile", "--ignore-scripts", "--production"]

FROM oven/bun:${BUN_VERSION}

# Drop privileges and become the bun user
USER nonroot
WORKDIR /usr/src/app
 
# Copy dependencies from deps stage
COPY --from=deps /usr/src/app/node_modules ./node_modules

# Add the rest of the application
ADD . .

# Add production environment variables
ENV NODE_ENV=production

ENTRYPOINT ["bun", "run", "bin/chadgpt.js"]
