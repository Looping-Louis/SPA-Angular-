###
# Dockerfile für das Angular-Frontend.
# Baut das Projekt in einem Node-Container und serviert das Ergebnis über NGINX.
###

## Build-Stage
FROM node:20-alpine AS builder
WORKDIR /app

# Nur package-Dateien kopieren, damit npm ci gecacht werden kann.
COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps

# Projektdateien kopieren und Produktions-Build erstellen.
COPY frontend ./
RUN npm run build -- --configuration production

## Runtime-Stage
FROM nginx:stable-alpine AS runtime

# Static Build nach NGINX-Webroot kopieren.
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html

# NGINX-Ausgabeport dokumentieren.
EXPOSE 80

# Standardkommando von NGINX beibehalten.
CMD ["nginx", "-g", "daemon off;"]
