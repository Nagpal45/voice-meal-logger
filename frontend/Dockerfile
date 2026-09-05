FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
# Expose host to allow external connections in Docker
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]