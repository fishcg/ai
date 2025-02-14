FROM node:22.14.0-alpine

WORKDIR /home/www/ai

COPY package.json entrypoint.sh ./

RUN npm config set registry https://registry.npm.taobao.org \
    && npm install

COPY . .

USER root

RUN chmod +x ./entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]
