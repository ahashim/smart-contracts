FROM node:16.17.1-slim

# app directory
WORKDIR /app

# dependencies
COPY package.json ./
RUN npm install

# app source
COPY . .

# hardhat network rpc port
EXPOSE 8545

# start hardhat node
CMD ["npm", "run", "node"]
