FROM node:14-alpine
#chuẩn bị môi trường node.js, version node14/alpine

WORKDIR /bookingcare/backend

COPY package*.json ./

RUN npm install

RUN npm install -g @babel/core @babel/cli

COPY . .

RUN npm run build-src

CMD [ "npm","run", "build" ]

#docker build --tag node-docker .
# docker run -p 5000:5000 -d node-docker