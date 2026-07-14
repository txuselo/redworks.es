FROM node:22-bookworm-slim AS dev
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
EXPOSE 4321
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
