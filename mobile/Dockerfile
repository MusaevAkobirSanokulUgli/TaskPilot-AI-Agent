FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 19006

CMD ["npx", "expo", "start", "--web"]
