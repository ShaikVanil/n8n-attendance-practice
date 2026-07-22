# Build stage
FROM node:20-alpine AS build

# Install build dependencies for native modules
RUN apk add --no-cache \
    autoconf \
    automake \
    libtool \
    make \
    g++ \
    python3 \
    pkgconfig \
    nasm \
    libpng-dev \
    libjpeg-turbo-dev

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build without running prebuild (skip lint and tests)
RUN npm run build:prod

# Production stage
FROM nginx:alpine

# Copy built assets
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.prod.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]