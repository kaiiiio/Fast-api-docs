# Stage 1: Build stage using the heavy node-alpine image
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package manifests and Prisma schema for dependency installation
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (development and production)
RUN npm install

# Copy the rest of the source code
COPY . .

# Generate the Prisma Client and build the NestJS app
RUN npx prisma generate
RUN npm run build

# Stage 2: Production stage using a clean image to keep it small
FROM node:18-alpine

WORKDIR /app

# Only copy the necessary files from the build stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

# Start the application using the production command
CMD ["npm", "run", "start:prod"]
