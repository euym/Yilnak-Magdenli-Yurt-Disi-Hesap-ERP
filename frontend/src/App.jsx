import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:10000';

const blankTrip = {
  project_id: '',
  project_name: '',
  load_type: '',
  load_width: '',
  load_height: '',
  load_length: '',
  load_weight: '',
  tractor_tonnage: '',
  trailer_tonnage: '',
  tonnage_capacity_formula: 130000,
  start_country_id: '',
  start_city_id: '',
  unloading_country_id: '',
  unloading_city_id: '',
  end_country_id: '',
  end_city_id: '',
  trip_count: 1,
  start_km: '',
  end_km: '',
  driver_id: '',
  tractor_id: '',
  tractor_info_id: '',
  trailer_id: '',
  trailer_info_id: '',
  escort_id: '',
  escort_vehicle_id: '',
  escort_vehicle_info_id: ''
};

const defTabs = [
  ['projects', 'Proje Adı'],
  ['drivers', 'Sürücü'],
  ['tractors', 'Çekici'],
  ['trailers', 'Dorse'],
  ['escorts', 'Öncü'],
  ['escortVehicles', 'Öncü Araç'],
  ['countries', 'Ülke'],
  ['cities', 'Şehir']
];

function numberValue(value) {
  const n = Number(String(value || '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function App() {
  const [screen, setScreen] = useState('trip');
  const [defs, setDefs] = useState(null);
  const [trips, setTrips] = useState([]);
  const [trip, setTrip] = useState(blankTrip);
  const [message, setMessage] = useState('');

  async function request(path, options = {}) {
    const res = await fetch(API + path, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'İşlem başarısız');
    return json.data;
  }

  async function loadAll() {
    const [definitions, tripList] = await Promise.all([
      request('/definitions'),
      request('/trips')
    ]);
    setDefs(definitions);
    setTrips(tripList);
  }

  useEffect(() => {
    loadAll().catch(err => {
      console.error(err);
      setMessage('Bağlantı hatası: ' + err.message);
      setDefs({
        projects: [], drivers: [], tractors: [], trailers: [], escorts: [], escortVehicles: [], countries: [], cities: []
      });
    });
  }, []);

  const totalTonnage = useMemo(() => {
    return numberValue(trip.load_weight) + numberValue(trip.tractor_tonnage) + numberValue(trip.trailer_tonnage);
  }, [trip.load_weight, trip.tractor_tonnage, trip.trailer_tonnage]);

  const tonnagePercent = useMemo(() => {
    const formula = numberValue(trip.tonnage_capacity_formula) || 130000;
    return formula ? (totalTonnage / formula) * 100 : 0;
  }, [totalTonnage, trip.tonnage_capacity_formula]);

  const totalTripKm = useMemo(() => {
    const start = numberValue(trip.start_km);
    const end = numberValue(trip.end_km);
    return end > start ? end - start : 0;
  }, [trip.start_km, trip.end_km]);

  const tripKm = useMemo(() => {
    return totalTripKm / 2;
  }, [totalTripKm]);

  const driverProjectTotalTripCount = useMemo(() => {
    if (!trip.driver_id || !trip.project_id) return 0;
    const registeredTotal = trips
      .filter(t => t.driver_id === trip.driver_id && t.project_id === trip.project_id)
      .reduce((sum, t) => sum + (numberValue(t.trip_count) || 1), 0);
    return registeredTotal + (numberValue(trip.trip_count) || 0);
  }, [trips, trip.driver_id, trip.project_id, trip.trip_count]);

  function setField(name, value) {
    setTrip(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'start_country_id') next.start_city_id = '';
      if (name === 'unloading_country_id') next.unloading_city_id = '';
      if (name === 'end_country_id') next.end_city_id = '';
      return next;
    });
  }

  function citiesFor(countryId) {
    if (!defs) return [];
    return defs.cities.filter(c => c.country_id === countryId);
  }

  async function saveTrip(e) {
    e.preventDefault();
    try {
      const payload = {
        ...trip,
        project_name: defs.projects.find(p => p.id === trip.project_id)?.name || trip.project_name || null,
        total_tonnage: totalTonnage,
        tonnage_fill_percent: tonnagePercent,
        trip_km: tripKm,
        total_trip_km: totalTripKm
      };
      const saved = await request('/trips', { method: 'POST', body: JSON.stringify(payload) });
      setMessage('Sefer kaydedildi. Avans/Masraf sayfası sonraki adımda eklenecek.');
      setTrip(blankTrip);
      await loadAll();
      setScreen('next');
    } catch (err) {
      alert(err.message);
    }
  }

  if (!defs) return <div className="page">Yükleniyor...</div>;

  return (
    <div className="page">
      <header className="hero">
        <h1>Yılnak &amp; Mağdenli Yurt Dışı Hesap ERP Yazılımı</h1>
        <p>Sayfa 1: Sefer bilgi girişi. Sonraki adımda Avans/Masraf ekranı eklenecek.</p>
      </header>

      <div className="topActions">
        <button className={screen === 'trip' ? 'active' : ''} onClick={() => setScreen('trip')}>Sefer Bilgileri</button>
        <button className={screen === 'definitions' ? 'active' : ''} onClick={() => setScreen('definitions')}>Tanımlar</button>
      </div>

      {message && <div className="message">{message}</div>}

      {screen === 'trip' && (
        <div className="layout">
          <aside className="sideCard">
            <h3>Kayıtlı Seferler</h3>
            {trips.length === 0 && <p>Henüz sefer yok.</p>}
            {trips.map(t => {
              const driverName = defs.drivers.find(d => d.id === t.driver_id)?.name || 'Şoför yok';
              return (
                <div className="tripItem" key={t.id}>
                  <b>{t.project_name || 'Projesiz Sefer'}</b>
                  <span>{driverName} · Sefer: {Number(t.trip_count || 1)} · {new Date(t.created_at).toLocaleDateString('tr-TR')}</span>
                </div>
              );
            })}
          </aside>

          <main className="card">
            <h2>Yeni Sefer Bilgileri</h2>
            <form onSubmit={saveTrip}>
              <section>
                <h3>Yük Bilgileri</h3>
                <div className="grid two">
                  <Select label="Proje adı" value={trip.project_id} onChange={v => setField('project_id', v)} options={defs.projects} textKey="name" />
                  <Input placeholder="Yük cinsi" value={trip.load_type} onChange={v => setField('load_type', v)} />
                  <Input type="number" placeholder="Yük Genişliği (m)" value={trip.load_width} onChange={v => setField('load_width', v)} />
                  <Input type="number" placeholder="Yük Yüksekliği (m)" value={trip.load_height} onChange={v => setField('load_height', v)} />
                  <Input type="number" placeholder="Yük Uzunluğu (m)" value={trip.load_length} onChange={v => setField('load_length', v)} />
                  <Input type="number" placeholder="Yük Ağırlığı (kg)" value={trip.load_weight} onChange={v => setField('load_weight', v)} />
                  <Input type="number" placeholder="Çekici Tonaj (kg)" value={trip.tractor_tonnage} onChange={v => setField('tractor_tonnage', v)} />
                  <Input type="number" placeholder="Dorse Tonaj (kg)" value={trip.trailer_tonnage} onChange={v => setField('trailer_tonnage', v)} />
                  <ReadOnly label="Toplam Tonaj (kg)" value={totalTonnage.toLocaleString('tr-TR')} />
                  <ReadOnly label="Tonaj Doluluk (%)" value={tonnagePercent.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} />
                  <Input type="number" placeholder="Tonaj kapasite formülü" value={trip.tonnage_capacity_formula} onChange={v => setField('tonnage_capacity_formula', v)} />
                </div>
              </section>

              <section>
                <h3>Sefer Konumları</h3>
                <div className="grid two">
                  <Select label="Sefer Başlangıç Ülke" value={trip.start_country_id} onChange={v => setField('start_country_id', v)} options={defs.countries} textKey="name" />
                  <Select label="Sefer Başlangıç Şehri" value={trip.start_city_id} onChange={v => setField('start_city_id', v)} options={citiesFor(trip.start_country_id)} textKey="name" />
                  <Select label="İndirme Ülkesi" value={trip.unloading_country_id} onChange={v => setField('unloading_country_id', v)} options={defs.countries} textKey="name" />
                  <Select label="İndirme Şehri" value={trip.unloading_city_id} onChange={v => setField('unloading_city_id', v)} options={citiesFor(trip.unloading_country_id)} textKey="name" />
                  <Select label="Sefer Bitiş Ülkesi" value={trip.end_country_id} onChange={v => setField('end_country_id', v)} options={defs.countries} textKey="name" />
                  <Select label="Sefer Bitiş Şehri" value={trip.end_city_id} onChange={v => setField('end_city_id', v)} options={citiesFor(trip.end_country_id)} textKey="name" />
                  <Input type="number" placeholder="Sefer Sayısı" value={trip.trip_count} onChange={v => setField('trip_count', v)} />
                  <ReadOnly label="Toplam Sefer Sayısı" value={driverProjectTotalTripCount.toLocaleString('tr-TR')} />
                  <Input type="number" placeholder="Başlangıç KM" value={trip.start_km} onChange={v => setField('start_km', v)} />
                  <Input type="number" placeholder="Bitiş KM" value={trip.end_km} onChange={v => setField('end_km', v)} />
                  <ReadOnly label="Sefer KM" value={tripKm.toLocaleString('tr-TR')} />
                  <ReadOnly label="Toplam Sefer KM" value={totalTripKm.toLocaleString('tr-TR')} />
                </div>
                <p className="hint">Sefer KM, toplam KM'nin yarısıdır: sadece gidiş mesafesi olarak hesaplanır. Toplam Sefer KM = Bitiş KM - Başlangıç KM.</p>
                <p className="hint">Toplam Sefer Sayısı sadece aynı proje ve aynı şoför kayıtlarından otomatik hesaplanır.</p>
              </section>

              <section>
                <h3>Sefer Ekipman ve Şoförleri</h3>
                <div className="grid two">
                  <Select label="Sürücü Adı Soyadı" value={trip.driver_id} onChange={v => setField('driver_id', v)} options={defs.drivers} textKey="name" />
                  <Select label="Çekici Plakası" value={trip.tractor_id} onChange={v => setField('tractor_id', v)} options={defs.tractors} textKey="plate" />
                  <Select label="Çekici Bilgileri" value={trip.tractor_info_id} onChange={v => setField('tractor_info_id', v)} options={defs.tractors} textKey="info" fallbackKey="plate" />
                  <Select label="Dorse Plakası" value={trip.trailer_id} onChange={v => setField('trailer_id', v)} options={defs.trailers} textKey="plate" />
                  <Select label="Dorse Bilgileri" value={trip.trailer_info_id} onChange={v => setField('trailer_info_id', v)} options={defs.trailers} textKey="info" fallbackKey="plate" />
                  <Select label="Öncü Adı Soyadı" value={trip.escort_id} onChange={v => setField('escort_id', v)} options={defs.escorts} textKey="name" />
                  <Select label="Öncü Plakası" value={trip.escort_vehicle_id} onChange={v => setField('escort_vehicle_id', v)} options={defs.escortVehicles} textKey="plate" />
                  <Select label="Öncü Araç Bilgileri" value={trip.escort_vehicle_info_id} onChange={v => setField('escort_vehicle_info_id', v)} options={defs.escortVehicles} textKey="info" fallbackKey="plate" />
                </div>
              </section>

              <button className="primary" type="submit">Seferi Kaydet ve Avans/Masrafa Geç</button>
            </form>
          </main>
        </div>
      )}

      {screen === 'definitions' && <Definitions defs={defs} reload={loadAll} request={request} />}
      {screen === 'next' && (
        <div className="card center">
          <h2>Sefer kaydedildi</h2>
          <p>Bir sonraki geliştirme: Avans ve Masraf sayfası.</p>
          <button className="primary" onClick={() => setScreen('trip')}>Yeni Sefer Gir</button>
        </div>
      )}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text' }) {
  return <input type={type} step="0.01" placeholder={placeholder} value={value ?? ''} onChange={e => onChange(e.target.value)} />;
}

function Select({ label, value, onChange, options, textKey, fallbackKey }) {
  return (
    <select value={value || ''} onChange={e => onChange(e.target.value)}>
      <option value="">{label}</option>
      {options.map(o => {
        const text = o[textKey] || o[fallbackKey] || o.name || o.plate || 'Tanım';
        return <option key={o.id} value={o.id}>{text}</option>;
      })}
    </select>
  );
}

function ReadOnly({ label, value }) {
  return <div className="readonly"><span>{label}</span><b>{value}</b></div>;
}

function Definitions({ defs, reload, request }) {
  const [tab, setTab] = useState('projects');
  const [form, setForm] = useState({});

  async function add(e) {
    e.preventDefault();
    try {
      let payload = {};
      if (tab === 'projects') payload = { name: form.name };
      if (tab === 'drivers') payload = { name: form.name };
      if (tab === 'tractors') payload = { plate: form.plate, info: form.info };
      if (tab === 'trailers') payload = { plate: form.plate, info: form.info };
      if (tab === 'escorts') payload = { name: form.name };
      if (tab === 'escortVehicles') payload = { plate: form.plate, info: form.info };
      if (tab === 'countries') payload = { name: form.name };
      if (tab === 'cities') payload = { country_id: form.country_id, name: form.name };

      await request('/definitions/' + tab, { method: 'POST', body: JSON.stringify(payload) });
      setForm({});
      await reload();
      alert('Eklendi');
    } catch (err) {
      alert('Eklenemedi: ' + err.message);
    }
  }

  async function remove(id) {
    if (!confirm('Silinsin mi?')) return;
    await request(`/definitions/${tab}/${id}`, { method: 'DELETE' });
    await reload();
  }

  const list = defs[tab] || [];

  return (
    <div className="card">
      <h2>Tanımlar</h2>
      <div className="defTabs">
        {defTabs.map(([key, label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => { setTab(key); setForm({}); }}>{label}</button>)}
      </div>

      <form className="definitionForm" onSubmit={add}>
        {['projects', 'drivers', 'escorts', 'countries'].includes(tab) && (
          <input required placeholder="Ad / Tanım" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} />
        )}
        {['tractors', 'trailers', 'escortVehicles'].includes(tab) && (
          <>
            <input required placeholder="Plaka" value={form.plate || ''} onChange={e => setForm({ ...form, plate: e.target.value })} />
            <input placeholder="Bilgiler" value={form.info || ''} onChange={e => setForm({ ...form, info: e.target.value })} />
          </>
        )}
        {tab === 'cities' && (
          <>
            <select required value={form.country_id || ''} onChange={e => setForm({ ...form, country_id: e.target.value })}>
              <option value="">Ülke seç</option>
              {defs.countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input required placeholder="Şehir adı" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} />
          </>
        )}
        <button className="primary">Ekle</button>
      </form>

      <div className="definitionList">
        {list.map(item => (
          <div key={item.id}>
            <span>{item.name || item.plate} {item.info ? `- ${item.info}` : ''}</span>
            <button onClick={() => remove(item.id)}>Sil</button>
          </div>
        ))}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);