# Step 1: Build React App
FROM node:18-alpine AS build-stage

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Pass build-time environment variables for Vite
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Step 2: Serve React App with Nginx
FROM nginx:stable-alpine

COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
