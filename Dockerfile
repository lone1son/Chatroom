FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

ENV PORT=4173
ENV CHATROOM_DATA_PATH=/data/chatroom.json
EXPOSE 4173

CMD ["npm", "start"]
