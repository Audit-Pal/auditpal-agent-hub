FROM oven/bun:1.2-alpine AS base

WORKDIR /app

# Install dependencies
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# Copy source
COPY . .

# Generate Prisma client
RUN bunx prisma generate

EXPOSE 3001

CMD ["bun", "run", "start"]
