import React from "react";
import "./MasrafOzeti.css";

const Box = ({ title, children }) => (
  <div className="masraf-box">
    <div className="masraf-box-title">{title}</div>
    <div className="masraf-box-body">{children}</div>
  </div>
);

const Row = ({ label, value = "-" }) => (
  <div className="masraf-row">
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

export default function MasrafOzeti({ data = {} }) {
  return (
    <section className="masraf-ozeti">
      <h2>Masraf Özeti</h2>

      <div className="masraf-grid">
        <Box title="Boş Yakıt">
          <Row label="Boş Yurt İçi Yakıt (lt)" value={data.bosYurtIciYakitLt} />
          <Row label="Boş Yurt İçi Yakıt" value={data.bosYurtIciYakit} />
          <Row label="Boş Yurt Dışı Yakıt (lt)" value={data.bosYurtDisiYakitLt} />
          <Row label="Boş Yurt Dışı Yakıt" value={data.bosYurtDisiYakit} />
          <Row label="Toplam Boş Yakıt (lt)" value={data.toplamBosYakitLt} />
          <Row label="Toplam Boş Yakıt" value={data.toplamBosYakit} />
          <Row label="Boş Yakıt (%)" value={data.bosYakitYuzde} />
        </Box>

        <Box title="Dolu Yakıt">
          <Row label="Dolu Yurt İçi Yakıt (lt)" value={data.doluYurtIciYakitLt} />
          <Row label="Dolu Yurt İçi Yakıt" value={data.doluYurtIciYakit} />
          <Row label="Dolu Yurt Dışı Yakıt (lt)" value={data.doluYurtDisiYakitLt} />
          <Row label="Dolu Yurt Dışı Yakıt" value={data.doluYurtDisiYakit} />
          <Row label="Toplam Dolu Yakıt (lt)" value={data.toplamDoluYakitLt} />
          <Row label="Toplam Dolu Yakıt" value={data.toplamDoluYakit} />
          <Row label="Dolu Yakıt (%)" value={data.doluYakitYuzde} />
        </Box>

        <Box title="Çekici Yakıt Özeti">
          <Row label="Çekici Yakıt Ortalaması (%)" value={data.cekiciYakitOrtalama} />
          <Row label="Çekici Toplam Yakıt Maliyeti" value={data.cekiciToplamYakitMaliyeti} />
        </Box>

        <Box title="Öncü Yakıt">
          <Row label="Yurt İçi Yakıt (lt)" value={data.oncuYurtIciYakitLt} />
          <Row label="Yurt İçi Yakıt" value={data.oncuYurtIciYakit} />
          <Row label="Yurt Dışı Yakıt (lt)" value={data.oncuYurtDisiYakitLt} />
          <Row label="Yurt Dışı Yakıt" value={data.oncuYurtDisiYakit} />
          <Row label="Yakıt Toplam" value={data.oncuYakitToplam} />
        </Box>

        <Box title="Yakıt Maliyet">
          <Row label="Yurt İçi Yakıt" value={data.yakitMaliyetYurtIci} />
          <Row label="Yurt Dışı Yakıt" value={data.yakitMaliyetYurtDisi} />
          <Row label="Yakıt Toplam" value={data.yakitMaliyetToplam} />
        </Box>

        <Box title="Çekici Ücretli Otoyol">
          <Row label="Yurt İçi Otoyolu Geçiş" value={data.cekiciOtoyolYurtIci} />
          <Row label="Yurt Dışı Otoyolu Geçiş" value={data.cekiciOtoyolYurtDisi} />
          <Row label="Otoyol Geçiş Toplam" value={data.cekiciOtoyolToplam} />
        </Box>

        <Box title="Öncü Ücretli Otoyol">
          <Row label="Yurt İçi Otoyolu Geçiş" value={data.oncuOtoyolYurtIci} />
          <Row label="Yurt Dışı Otoyolu Geçiş" value={data.oncuOtoyolYurtDisi} />
          <Row label="Otoyol Geçiş Toplam" value={data.oncuOtoyolToplam} />
        </Box>

        <Box title="Ücretli Otoyol Maliyet">
          <Row label="Yurt İçi Otoyolu Geçiş" value={data.otoyolMaliyetYurtIci} />
          <Row label="Yurt Dışı Otoyolu Geçiş" value={data.otoyolMaliyetYurtDisi} />
          <Row label="Otoyol Geçiş Toplam" value={data.otoyolMaliyetToplam} />
        </Box>

        <Box title="Yol Belgesi">
          <Row label="Yol Belge Maliyeti" value={data.yolBelgeMaliyeti} />
          <Row label="Yol Belgesi Toplam Maliyet" value={data.yolBelgesiToplamMaliyet} />
        </Box>

        <Box title="Diğer Masraflar">
          {(data.digerMasraflar || []).map((item, index) => (
            <Row key={index} label={item.ad || item.name || "Masraf"} value={item.tutar || item.amount || "-"} />
          ))}
          <Row label="Seçilen Masraflar Toplamı" value={data.digerMasraflarToplam} />
        </Box>
      </div>
    </section>
  );
}
