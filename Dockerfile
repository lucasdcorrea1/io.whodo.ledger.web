# syntax=docker/dockerfile:1.6

FROM node:22-alpine AS base
WORKDIR /app
COPY package.json ./
RUN npm install --legacy-peer-deps

FROM base AS dev
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM base AS builder
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS prod
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
