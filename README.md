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

## V1.2 Düzeltme
- Sefer Konumları bölümünde "Sefer Sayısı" yanına "Toplam Sefer Sayısı" eklendi.
- Toplam Sefer Sayısı, seçilen şoförün kayıtlı seferlerinden otomatik hesaplanır.


## V1.3 Düzeltme
- Toplam Sefer Sayısı artık sadece aynı proje + aynı şoför eşleşmesindeki kayıtları toplar.
- Farklı projedeki aynı şoför seferleri bu toplamı artırmaz.


## V1.4 Düzeltme
- Toplam Sefer KM = Bitiş KM - Başlangıç KM.
- Sefer KM = Toplam Sefer KM / 2.
- Böylece Sefer KM sadece gidişi, Toplam Sefer KM gidiş+dönüş toplamını temsil eder.
