FROM node:16.13 as base

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install --legacy-peer-deps
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . .

ENV NODE_PATH=./build

RUN npm run build

FROM base as production

ENV NODE_PATH=./build

EXPOSE 5005
CMD ["node", "./build/server.js"]
