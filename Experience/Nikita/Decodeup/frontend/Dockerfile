# Stage 1: Build the React application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package manifests and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build for production
COPY . .
RUN npm run build

# Stage 2: Serve the application using Nginx
FROM nginx:alpine

# Copy built static files from Stage 1 to Nginx's public directory
COPY --from=builder /app/dist /usr/share/nginx/html
# Optional: Copy package.json for metadata/logging
COPY --from=builder /app/package.json /app/package.json

EXPOSE 80

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
