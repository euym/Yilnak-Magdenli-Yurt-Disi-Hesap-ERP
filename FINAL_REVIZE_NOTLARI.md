# Yılnak ERP Final Revize

Bu paket GitHub'a doğrudan yüklenmek üzere gerçek proje dosyaları üzerinden hazırlanmıştır.

## Yapılanlar
- Masraf kategorileri sabit listeden çıkarıldı; `Tanımlar > Masraf Kategorileri` ekranından ekle/sil yapılabilir.
- Masraf tanımı artık kategoriye bağlanır; para birimi kategori üzerinden otomatik gelir.
- Masraf girişinde para birimi kilitlendi; kullanıcı yanlışlıkla EUR kategoriye TL veya TL kategoriye EUR giremez.
- Backend `/expenses` endpointinde para birimi kontrolü eklendi.
- Supabase SQL tarafında trigger ile DB seviyesinde para birimi eşleşme validasyonu eklendi.
- Masraf ekranındaki sol bilgi kutucukları kaldırıldı.
- Masraf Özeti sekmesi kaldırıldı.
- Maliyet/Gerçekleşen ve Rapor üst menüden kaldırıldı; raporlar sonraki revizeye bırakıldı.
- Yakıt özeti masraf ekranına 6 tablo olarak eklendi:
  1. Çekici Boş Yakıt
  2. Çekici Dolu Yakıt
  3. Çekici Yakıt Ortalama
  4. Çekici Toplam Yakıt Masrafı
  5. Öncü Yakıt
  6. Yakıt Maliyet

## SQL
Supabase SQL Editor'da şu dosyayı tek seferde çalıştırın:

`database/YILNAK_ERP_TEK_PARCA_SQL.sql`

Aynı içerik `supabase/schema.sql` içinde de vardır.
