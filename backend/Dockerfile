FROM ghcr.io/puppeteer/puppeteer:latest

USER root
RUN npm install -g pnpm

USER pptruser
WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 5000

CMD ["pnpm", "start"]
