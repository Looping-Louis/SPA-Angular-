###
# Dockerfile – Angular SPA über Nginx ausliefern
# Struktur erwartet:
#   /Dockerfile
#   /nginx.conf
#   /frontend/ (Angular-Projekt)
#
# Wichtig: In frontend/angular.json sollte der Browser-Build ohne SSR
#          auf "outputPath": "dist/frontend" zeigen.
###

# -------- Stage 1: Build --------
FROM node:20-alpine AS build
WORKDIR /app

# Nur package-Dateien (besseres Caching)
COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps

# Quellcode & Build
COPY frontend ./
# Falls du ein anderes Config-Target nutzt, hier anpassen
RUN npm run build

# -------- Stage 2: Runtime (Nginx) --------
FROM nginx:stable-alpine

# Eigene Nginx-Config mit SPA-Routing
# (Datei muss im Repo-Root liegen)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Nginx-Default-Inhalte entfernen und unsere App deployen
RUN rm -rf /usr/share/nginx/html/*
# Achtung: Hier wird der Browser-Build erwartet unter dist/frontend/
# (genau so wie in angular.json -> options.outputPath)
COPY --from=build /app/dist/frontend/ /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
