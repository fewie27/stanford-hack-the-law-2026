FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Baked at build time: public API origin only, e.g. https://api-evidence.example.com (no path after host).
ARG EVIDENCE_API_BASE_URL=
ENV EVIDENCE_API_BASE_URL=$EVIDENCE_API_BASE_URL
ENV EXPO_PUBLIC_EVIDENCE_API_BASE_URL=$EVIDENCE_API_BASE_URL

ENV NODE_ENV=production
ENV EXPO_NO_TELEMETRY=1
RUN npx expo export --platform web

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
