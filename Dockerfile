FROM node:19.4.0-alpine3.17

USER node
WORKDIR /usr/src/app

# RUN chown node:node /usr/src/app

COPY --chown=node:node ./package.json ./package-lock.json .

RUN npm install --omit=dev --ignore-scripts

COPY ./config.json index.js .

ENV OPENAI_API_KEY

CMD ["index.js"]
