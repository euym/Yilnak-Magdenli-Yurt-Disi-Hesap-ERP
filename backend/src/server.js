import React from "react";
import "./MasrafOzeti.css";

const Box = ({ title, children }) => (
  <div className="erp-box">
    <div className="erp-box-title">{title}</div>
    <div className="erp-box-body">{children}</div>
  </div>
);

const Row = ({ label }) => (
  <div className="erp-row">
    <span>{label}</span>
    <span>-</span>
  </div>
);

export default function MasrafOzeti() {
  return (
    <div className="masraf-ozeti-grid">
      <Box title="Boş Yakıt">
        <Row label="Boş Yurt İçi Yakıt (lt)" />
        <Row label="Boş Yurt İçi Yakıt" />
        <Row label="Boş Yurt Dışı Yakıt (lt)" />
        <Row label="Boş Yurt Dışı Yakıt" />
        <Row label="Toplam Boş Yakıt (lt)" />
        <Row label="Toplam Boş Yakıt" />
        <Row label="Boş Yakıt (%)" />
      </Box>

      <Box title="Dolu Yakıt">
        <Row label="Dolu Yurt İçi Yakıt (lt)" />
        <Row label="Dolu Yurt İçi Yakıt" />
        <Row label="Dolu Yurt Dışı Yakıt (lt)" />
        <Row label="Dolu Yurt Dışı Yakıt" />
        <Row label="Toplam Dolu Yakıt (lt)" />
        <Row label="Toplam Dolu Yakıt" />
        <Row label="Dolu Yakıt (%)" />
      </Box>

      <Box title="Çekici Yakıt Özeti">
        <Row label="Çekici Yakıt Ortalaması (%)" />
        <Row label="Çekici Toplam Yakıt Maliyeti" />
      </Box>

      <Box title="Öncü Yakıt">
        <Row label="Yurt İçi Yakıt (lt)" />
        <Row label="Yurt İçi Yakıt" />
        <Row label="Yurt Dışı Yakıt (lt)" />
        <Row label="Yurt Dışı Yakıt" />
        <Row label="Yakıt Toplam" />
      </Box>

      <Box title="Yakıt Maliyet">
        <Row label="Yurt İçi Yakıt" />
        <Row label="Yurt Dışı Yakıt" />
        <Row label="Yakıt Toplam" />
      </Box>

      <Box title="Çekici Ücretli Otoyol">
        <Row label="Yurt İçi Geçiş" />
        <Row label="Yurt Dışı Geçiş" />
        <Row label="Toplam Geçiş" />
      </Box>

      <Box title="Öncü Ücretli Otoyol">
        <Row label="Yurt İçi Geçiş" />
        <Row label="Yurt Dışı Geçiş" />
        <Row label="Toplam Geçiş" />
      </Box>

      <Box title="Ücretli Otoyol Maliyet">
        <Row label="Yurt İçi Geçiş" />
        <Row label="Yurt Dışı Geçiş" />
        <Row label="Toplam Geçiş" />
      </Box>

      <Box title="Yol Belgesi">
        <Row label="Yol Belge Maliyeti" />
        <Row label="Toplam Maliyet" />
      </Box>

      <Box title="Diğer Masraflar">
        <Row label="Toplam" />
      </Box>
    </div>
  );
}
