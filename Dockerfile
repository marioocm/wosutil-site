FROM node:24-bookworm-slim AS build

RUN npm install --global pnpm@10

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

ARG SITE_URL=https://wosutil.mariocm.dev
ARG BASE_PATH=/
ARG PUBLIC_SIM_API=/sim
ENV SITE_URL=${SITE_URL} \
    BASE_PATH=${BASE_PATH} \
    PUBLIC_SIM_API=${PUBLIC_SIM_API}

RUN pnpm build

FROM nginxinc/nginx-unprivileged:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
