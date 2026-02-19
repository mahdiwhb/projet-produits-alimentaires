FROM node:20-bullseye-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y python3 make g++ build-essential \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install && npm rebuild

COPY . .

CMD ["node", "etl.js"]
