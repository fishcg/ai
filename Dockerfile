FROM 172.24.173.77:30500/node:24.13.0-alpine

WORKDIR /home/www/ai

COPY package.json package-lock.json entrypoint.sh ./

RUN npm install pnpm -g && pnpm install

COPY . .

USER root

RUN chmod +x ./entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]
