ARG BUN_VERSION=1.2

FROM oven/bun:${BUN_VERSION} AS deps

# Drop privileges and become the bun user
USER bun
WORKDIR /usr/src/app

# Install dependencies
COPY ./package.json ./bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts --production

FROM oven/bun:${BUN_VERSION}

# Drop privileges and become the bun user
USER bun
WORKDIR /usr/src/app
 
# Copy dependencies from deps stage
COPY --from=deps /usr/src/app/node_modules ./node_modules

# Add the rest of the application
ADD . .

ENTRYPOINT ["bun", "run", "bin/chadgpt.js"]
