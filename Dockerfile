ARG VERSION=lts-alpine

FROM node:$VERSION

LABEL maintainer="Renoki Co. <alex@renoki.org>"

COPY . /app

RUN npm install typescript@latest pm2 -g && \
    cd /app && \
    npm install && \
    npm run build && \
    rm -rf src/ .idea/ .vscode/

WORKDIR /app

ENTRYPOINT ["node", "/app/dist/app.js"]
