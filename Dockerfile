ARG VERSION=lts-alpine

FROM node:$VERSION

LABEL maintainer="Renoki Co. <alex@renoki.org>"

COPY . /app

RUN npm install typescript@latest -g && \
    cd /app && \
    mkdir stats && \
    npm install && \
    npm run build && \
    rm -rf src/ .idea/ .vscode/

WORKDIR /app

ENTRYPOINT ["node", "/app/dist/app.js"]