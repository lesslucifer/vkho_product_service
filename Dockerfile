FROM node:14-alpine

WORKDIR /usr/local/product-service

COPY package*.json ./

RUN npm install -f

COPY . .

RUN npm run build

CMD ["node", "dist/main"]