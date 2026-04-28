# Yılnak & Mağdenli Yurt Dışı Hesap ERP - V1

Bu paket sıfırdan hazırlanmış ilk sayfadır.

## İçerik
- Frontend: React + Vite
- Backend: Express
- Database: Supabase PostgreSQL
- İlk ekran: Sefer Bilgileri
- Tanımlar ekranı: dropdown listeleri için proje, sürücü, araç, dorse, öncü ve şehir tanımları

## Render Frontend
Root Directory: frontend
Build Command: npm install && npm run build
Publish Directory: dist

Environment:
VITE_API_URL=https://BACKEND-LINKIN.onrender.com

## Render Backend
Root Directory: backend
Build Command: npm install
Start Command: node src/server.js

Environment:
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=Supabase anon/public key

## Supabase
supabase/schema.sql dosyasını SQL Editor'da çalıştır.