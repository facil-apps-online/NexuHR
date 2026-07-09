#!/bin/bash
set -e

echo "🚀 Iniciando despliegue de NexuHR..."
echo "⬇️ 1/5 Descargando cambios de GitHub..."
git pull origin main

echo "🧹 2/5 Limpiando caché de npm..."
npm cache clean --force

echo "📦 3/5 Instalando dependencias..."
NODE_OPTIONS="--max-old-space-size=4096" npm install

echo "🌐 4/5 Actualizando listado de navegadores..."
BROWSERSLIST_IGNORE_OLD_DATA=true npx update-browserslist-db@latest || echo "⚠️ Aviso: No se pudo actualizar browserslist, continuando..."

echo "🏗️ 5/5 Construyendo la aplicación..."
NODE_OPTIONS="--max-old-space-size=4096" npm run build

echo "🔄 Reiniciando NGINX..."
sudo systemctl restart nginx

echo "✅ ¡Despliegue de NexuHR completado con éxito!"
