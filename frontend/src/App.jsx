import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:10000';

const blankTrip = {
  project_id: '', project_name: '', load_type: '', load_width: '', load_height: '', load_length: '', load_weight: '',
  tractor_tonnage: '', trailer_tonnage: '', tonnage_capacity_formula: 130000,
  start_country_id: '', start_city_id: '', unloading_country_id: '', unloading_city_id: '', end_country_id: '', end_city_id: '',
  trip_count: 1, start_km: '', end_km: '', driver_id: '', tractor_id: '', tractor_info_id: '', trailer_id: '', trailer_info_id: '',
  escort_id: '', escort_vehicle_id: '', escort_vehicle_info_id: ''
};

const blankExpense = {
  trip_id: '', expense_definition_id: '', country_id: '', city_id: '', vehicle_type: '', fuel_status: '', liter: '',
  amount: '', currency: '', expense_date: '', note: ''
};

const blankAdvance = {
  trip_id: '', receiver_type: '', receiver_name: '', amount: '', currency: 'TRY', advance_date: '', note: ''
};

const defTabs = [
  ['expenseDefinitions', 'Masraf'],
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
  const [expenses, setExpenses] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [trip, setTrip] = useState(blankTrip);
  const [expense, setExpense] = useState(blankExpense);
  const [advance, setAdvance] = useState(blankAdvance);
  const [message, setMessage] = useState('');

  async function request(path, options = {}) {
    const res = await fetch(API + path, { headers: { 'Content-Type': 'application/json' }, ...options });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'İşlem başarısız');
    return json.data;
  }

  async function loadAll() {
    const [definitions, tripList, expenseList, advanceList] = await Promise.all([
      request('/definitions'), request('/trips'), request('/expenses'), request('/advances')
    ]);
    setDefs(definitions);
    setTrips(tripList);
    setExpenses(expenseList);
    setAdvances(advanceList);
  }

  useEffect(() => {
    loadAll().catch(err => {
      console.error(err);
      setMessage('Bağlantı hatası: ' + err.message);
      setDefs({ projects: [], drivers: [], tractors: [], trailers: [], escorts: [], escortVehicles: [], countries: [], cities: [], expenseDefinitions: [] });
    });
  }, []);

  const totalTonnage = useMemo(() => numberValue(trip.load_weight) + numberValue(trip.tractor_tonnage) + numberValue(trip.trailer_tonnage), [trip.load_weight, trip.tractor_tonnage, trip.trailer_tonnage]);
  const tonnagePercent = useMemo(() => totalTonnage / (numberValue(trip.tonnage_capacity_formula) || 130000) * 100, [totalTonnage, trip.tonnage_capacity_formula]);
  const totalTripKm = useMemo(() => Math.max(0, numberValue(trip.end_km) - numberValue(trip.start_km)), [trip.start_km, trip.end_km]);
  const tripKm = useMemo(() => totalTripKm / 2, [totalTripKm]);
  const driverProjectTotalTripCount = useMemo(() => {
    if (!trip.driver_id || !trip.project_id) return 0;
    return trips.filter(t => t.driver_id === trip.driver_id && t.project_id === trip.project_id).reduce((s, t) => s + (numberValue(t.trip_count) || 1), 0) + (numberValue(trip.trip_count) || 0);
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
      const payload = { ...trip, project_name: defs.projects.find(p => p.id === trip.project_id)?.name || trip.project_name || null, total_tonnage: totalTonnage, tonnage_fill_percent: tonnagePercent, trip_km: tripKm, total_trip_km: totalTripKm };
      const saved = await request('/trips', { method: 'POST', body: JSON.stringify(payload) });
      setMessage('Sefer kaydedildi. Masraf ekranına geçildi.');
      setExpense({ ...blankExpense, trip_id: saved.id });
      setTrip(blankTrip);
      await loadAll();
      setScreen('expenses');
    } catch (err) { alert(err.message); }
  }

  if (!defs) return <div className="page">Yükleniyor...</div>;

  return (
    <div className="page">
      <header className="hero">
        <h1>Yılnak &amp; Mağdenli Yurt Dışı Hesap ERP Yazılımı</h1>
        <p>Sefer bilgi girişi, tanımlar, masraf ve avans girişi.</p>
      </header>
      <div className="topActions">
        <button className={screen === 'trip' ? 'active' : ''} onClick={() => setScreen('trip')}>Sefer Bilgileri</button>
        <button className={screen === 'definitions' ? 'active' : ''} onClick={() => setScreen('definitions')}>Tanımlar</button>
        <button className={screen === 'expenses' ? 'active' : ''} onClick={() => setScreen('expenses')}>Masraf</button>
        <button className={screen === 'advances' ? 'active' : ''} onClick={() => setScreen('advances')}>Avans</button>
      </div>
      {message && <div className="message">{message}</div>}
      {screen === 'trip' && <TripScreen defs={defs} trips={trips} trip={trip} setField={setField} saveTrip={saveTrip} totalTonnage={totalTonnage} tonnagePercent={tonnagePercent} tripKm={tripKm} totalTripKm={totalTripKm} driverProjectTotalTripCount={driverProjectTotalTripCount} citiesFor={citiesFor} />}
      {screen === 'definitions' && <Definitions defs={defs} reload={loadAll} request={request} />}
      {screen === 'expenses' && <ExpenseScreen defs={defs} trips={trips} expenses={expenses} expense={expense} setExpense={setExpense} request={request} reload={loadAll} />}
      {screen === 'advances' && <AdvanceScreen trips={trips} advances={advances} expenses={expenses} advance={advance} setAdvance={setAdvance} request={request} reload={loadAll} />}
    </div>
  );
}

function TripScreen({ defs, trips, trip, setField, saveTrip, totalTonnage, tonnagePercent, tripKm, totalTripKm, driverProjectTotalTripCount, citiesFor }) {
  return (
    <div className="layout">
      <aside className="sideCard">
        <h3>Kayıtlı Seferler</h3>
        {trips.length === 0 && <p>Henüz sefer yok.</p>}
        {trips.map(t => {
          const driverName = defs.drivers.find(d => d.id === t.driver_id)?.name || 'Şoför yok';
          return <div className="tripItem" key={t.id}><b>{t.project_name || 'Projesiz Sefer'}</b><span>{driverName} · Sefer: {Number(t.trip_count || 1)} · {new Date(t.created_at).toLocaleDateString('tr-TR')}</span></div>;
        })}
      </aside>
      <main className="card">
        <h2>Yeni Sefer Bilgileri</h2>
        <form onSubmit={saveTrip}>
          <section><h3>Yük Bilgileri</h3><div className="grid two">
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
          </div></section>
          <section><h3>Sefer Konumları</h3><div className="grid two">
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
          </div><p className="hint">Sefer KM, toplam KM'nin yarısıdır. Toplam Sefer KM = Bitiş KM - Başlangıç KM.</p></section>
          <section><h3>Sefer Ekipman ve Şoförleri</h3><div className="grid two">
            <Select label="Sürücü Adı Soyadı" value={trip.driver_id} onChange={v => setField('driver_id', v)} options={defs.drivers} textKey="name" />
            <Select label="Çekici Plakası" value={trip.tractor_id} onChange={v => setField('tractor_id', v)} options={defs.tractors} textKey="plate" />
            <Select label="Çekici Bilgileri" value={trip.tractor_info_id} onChange={v => setField('tractor_info_id', v)} options={defs.tractors} textKey="info" fallbackKey="plate" />
            <Select label="Dorse Plakası" value={trip.trailer_id} onChange={v => setField('trailer_id', v)} options={defs.trailers} textKey="plate" />
            <Select label="Dorse Bilgileri" value={trip.trailer_info_id} onChange={v => setField('trailer_info_id', v)} options={defs.trailers} textKey="info" fallbackKey="plate" />
            <Select label="Öncü Adı Soyadı" value={trip.escort_id} onChange={v => setField('escort_id', v)} options={defs.escorts} textKey="name" />
            <Select label="Öncü Plakası" value={trip.escort_vehicle_id} onChange={v => setField('escort_vehicle_id', v)} options={defs.escortVehicles} textKey="plate" />
            <Select label="Öncü Araç Bilgileri" value={trip.escort_vehicle_info_id} onChange={v => setField('escort_vehicle_info_id', v)} options={defs.escortVehicles} textKey="info" fallbackKey="plate" />
          </div></section>
          <button className="primary" type="submit">Seferi Kaydet ve Masrafa Geç</button>
        </form>
      </main>
    </div>
  );
}

function ExpenseScreen({ defs, trips, expenses, expense, setExpense, request, reload }) {
  const selectedDef = defs.expenseDefinitions.find(x => x.id === expense.expense_definition_id);
  const isFuel = selectedDef?.category === 'Yakıt';
  const summary = expenses.reduce((acc, item) => {
    const amount = numberValue(item.amount); acc.total += amount;
    if (item.category === 'Yakıt') { acc.fuel += amount; if (item.fuel_status === 'Boş') acc.emptyLiter += numberValue(item.liter); if (item.fuel_status === 'Dolu') acc.loadedLiter += numberValue(item.liter); }
    return acc;
  }, { total: 0, fuel: 0, emptyLiter: 0, loadedLiter: 0 });

  function setExpenseField(name, value) {
    setExpense(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'country_id') next.city_id = '';
      if (name === 'expense_definition_id') {
        const def = defs.expenseDefinitions.find(x => x.id === value);
        next.currency = def?.default_currency || next.currency || 'TRY';
        if (def?.category !== 'Yakıt') { next.fuel_status = ''; next.liter = ''; }
      }
      return next;
    });
  }

  async function saveExpense(e) {
    e.preventDefault();
    if (!expense.trip_id) return alert('Sefer seçiniz.');
    if (!expense.expense_definition_id) return alert('Masraf türü seçiniz.');
    if (isFuel && !expense.fuel_status) return alert('Yakıt için Boş/Dolu seçiniz.');
    if (isFuel && !expense.liter) return alert('Yakıt için litre giriniz.');
    await request('/expenses', { method: 'POST', body: JSON.stringify(expense) });
    setExpense({ ...blankExpense, trip_id: expense.trip_id });
    await reload();
    alert('Masraf eklendi');
  }

  return <div className="layout">
    <aside className="sideCard"><h3>Masraf Özeti</h3><div className="summaryGrid">
      <div><span>Toplam Masraf</span><b>{summary.total.toLocaleString('tr-TR')}</b></div>
      <div><span>Yakıt Toplamı</span><b>{summary.fuel.toLocaleString('tr-TR')}</b></div>
      <div><span>Boş Litre</span><b>{summary.emptyLiter.toLocaleString('tr-TR')}</b></div>
      <div><span>Dolu Litre</span><b>{summary.loadedLiter.toLocaleString('tr-TR')}</b></div>
    </div></aside>
    <main className="card"><h2>Masraf Girişi</h2>
      <form onSubmit={saveExpense}>
        <div className="grid two">
          <Select label="Sefer seç" value={expense.trip_id} onChange={v => setExpenseField('trip_id', v)} options={trips.map(t => ({ ...t, label: `${t.project_name || 'Projesiz'} - ${new Date(t.created_at).toLocaleDateString('tr-TR')}` }))} textKey="label" />
          <Select label="Masraf türü" value={expense.expense_definition_id} onChange={v => setExpenseField('expense_definition_id', v)} options={defs.expenseDefinitions} textKey="name" />
          <ReadOnly label="Kategori" value={selectedDef?.category || '-'} />
          <Select label="Ülke" value={expense.country_id} onChange={v => setExpenseField('country_id', v)} options={defs.countries} textKey="name" />
          <Select label="Şehir" value={expense.city_id} onChange={v => setExpenseField('city_id', v)} options={defs.cities.filter(c => c.country_id === expense.country_id)} textKey="name" />
          <select value={expense.vehicle_type || ''} onChange={e => setExpenseField('vehicle_type', e.target.value)}><option value="">Araç tipi</option><option>Çekici</option><option>Öncü</option><option>Diğer</option></select>
        </div>
        {isFuel && <div className="fuelBox"><b>Yakıt Durumu</b><label><input type="radio" name="fuel_status" checked={expense.fuel_status === 'Boş'} onChange={() => setExpenseField('fuel_status', 'Boş')} /> Boş</label><label><input type="radio" name="fuel_status" checked={expense.fuel_status === 'Dolu'} onChange={() => setExpenseField('fuel_status', 'Dolu')} /> Dolu</label><input type="number" step="0.01" placeholder="Litre" value={expense.liter || ''} onChange={e => setExpenseField('liter', e.target.value)} /></div>}
        <div className="grid two expenseBottom">
          <input required type="number" step="0.01" placeholder="Tutar" value={expense.amount || ''} onChange={e => setExpenseField('amount', e.target.value)} />
          <select value={expense.currency || selectedDef?.default_currency || 'TRY'} onChange={e => setExpenseField('currency', e.target.value)}><option>TRY</option><option>EUR</option><option>USD</option></select>
          <input type="date" value={expense.expense_date || ''} onChange={e => setExpenseField('expense_date', e.target.value)} />
          <input placeholder="Açıklama" value={expense.note || ''} onChange={e => setExpenseField('note', e.target.value)} />
        </div>
        <button className="primary" type="submit">Masraf Ekle</button>
      </form>
      <h3>Girilen Masraflar</h3><div className="tableWrap"><table><thead><tr><th>Masraf</th><th>Kategori</th><th>Ülke</th><th>Şehir</th><th>Araç</th><th>Durum</th><th>Litre</th><th>Tutar</th><th>Para</th><th>Tarih</th></tr></thead><tbody>{expenses.map(x => <tr key={x.id}><td>{x.expense_name}</td><td>{x.category}</td><td>{x.country_name || '-'}</td><td>{x.city_name || '-'}</td><td>{x.vehicle_type || '-'}</td><td>{x.fuel_status || '-'}</td><td>{x.liter || '-'}</td><td>{x.amount}</td><td>{x.currency}</td><td>{x.expense_date || '-'}</td></tr>)}</tbody></table></div>
    </main>
  </div>;
}


function AdvanceScreen({ trips, advances, expenses, advance, setAdvance, request, reload }) {
  const totalExpense = expenses.reduce((s, x) => s + numberValue(x.amount), 0);
  const totalAdvance = advances.reduce((s, x) => s + numberValue(x.amount), 0);
  const balance = totalAdvance - totalExpense;

  function setAdvanceField(name, value) {
    setAdvance(prev => ({ ...prev, [name]: value }));
  }

  async function saveAdvance(e) {
    e.preventDefault();
    if (!advance.trip_id) return alert('Sefer seçiniz.');
    if (!advance.receiver_type) return alert('Avans alan tipini seçiniz.');
    if (!advance.receiver_name) return alert('Avans alan kişi/adı giriniz.');
    if (!advance.amount) return alert('Tutar giriniz.');
    await request('/advances', { method: 'POST', body: JSON.stringify(advance) });
    setAdvance({ ...blankAdvance, trip_id: advance.trip_id });
    await reload();
    alert('Avans eklendi');
  }

  return <div className="layout">
    <aside className="sideCard"><h3>Avans / Masraf Özeti</h3><div className="summaryGrid">
      <div><span>Toplam Masraf</span><b>{totalExpense.toLocaleString('tr-TR')}</b></div>
      <div><span>Toplam Avans</span><b>{totalAdvance.toLocaleString('tr-TR')}</b></div>
      <div><span>{balance >= 0 ? 'Şoförde Kalan' : 'Firmadan Alacak'}</span><b>{Math.abs(balance).toLocaleString('tr-TR')}</b></div>
    </div></aside>
    <main className="card"><h2>Avans Girişi</h2>
      <form onSubmit={saveAdvance}>
        <div className="grid two">
          <Select label="Sefer seç" value={advance.trip_id} onChange={v => setAdvanceField('trip_id', v)} options={trips.map(t => ({ ...t, label: (t.project_name || 'Projesiz') + ' - ' + new Date(t.created_at).toLocaleDateString('tr-TR') }))} textKey="label" />
          <select required value={advance.receiver_type || ''} onChange={e => setAdvanceField('receiver_type', e.target.value)}>
            <option value="">Avans alan tipi</option><option>Şoför</option><option>Öncü</option><option>Taşeron</option><option>Diğer</option>
          </select>
          <input required placeholder="Avans alan kişi / firma" value={advance.receiver_name || ''} onChange={e => setAdvanceField('receiver_name', e.target.value)} />
          <input required type="number" step="0.01" placeholder="Tutar" value={advance.amount || ''} onChange={e => setAdvanceField('amount', e.target.value)} />
          <select value={advance.currency || 'TRY'} onChange={e => setAdvanceField('currency', e.target.value)}><option>TRY</option><option>EUR</option><option>USD</option></select>
          <input type="date" value={advance.advance_date || ''} onChange={e => setAdvanceField('advance_date', e.target.value)} />
          <input placeholder="Açıklama" value={advance.note || ''} onChange={e => setAdvanceField('note', e.target.value)} />
        </div>
        <button className="primary" type="submit">Avans Ekle</button>
      </form>
      <h3>Girilen Avanslar</h3><div className="tableWrap"><table><thead><tr><th>Sefer</th><th>Alan Tipi</th><th>Alan Kişi/Firma</th><th>Tutar</th><th>Para</th><th>Tarih</th><th>Açıklama</th></tr></thead><tbody>{advances.map(x => <tr key={x.id}><td>{x.trip_name || '-'}</td><td>{x.receiver_type}</td><td>{x.receiver_name}</td><td>{x.amount}</td><td>{x.currency}</td><td>{x.advance_date || '-'}</td><td>{x.note || '-'}</td></tr>)}</tbody></table></div>
    </main>
  </div>;
}

function Definitions({ defs, reload, request }) {
  const [tab, setTab] = useState('expenseDefinitions');
  const [form, setForm] = useState({});
  async function add(e) {
    e.preventDefault();
    try {
      let payload = {};
      if (tab === 'expenseDefinitions') payload = { name: form.name, category: form.category, default_currency: form.default_currency || 'TRY' };
      if (tab === 'projects') payload = { name: form.name };
      if (tab === 'drivers') payload = { name: form.name };
      if (tab === 'tractors') payload = { plate: form.plate, info: form.info };
      if (tab === 'trailers') payload = { plate: form.plate, info: form.info };
      if (tab === 'escorts') payload = { name: form.name };
      if (tab === 'escortVehicles') payload = { plate: form.plate, info: form.info };
      if (tab === 'countries') payload = { name: form.name };
      if (tab === 'cities') payload = { country_id: form.country_id, name: form.name };
      await request('/definitions/' + tab, { method: 'POST', body: JSON.stringify(payload) });
      setForm({}); await reload(); alert('Eklendi');
    } catch (err) { alert('Eklenemedi: ' + err.message); }
  }
  async function remove(id) { if (!confirm('Silinsin mi?')) return; await request(`/definitions/${tab}/${id}`, { method: 'DELETE' }); await reload(); }
  const list = defs[tab] || [];
  return <div className="card"><h2>Tanımlar</h2><div className="defTabs">{defTabs.map(([key, label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => { setTab(key); setForm({}); }}>{label}</button>)}</div>
    <form className="definitionForm" onSubmit={add}>
      {['projects', 'drivers', 'escorts', 'countries'].includes(tab) && <input required placeholder="Ad / Tanım" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} />}
      {['tractors', 'trailers', 'escortVehicles'].includes(tab) && <><input required placeholder="Plaka" value={form.plate || ''} onChange={e => setForm({ ...form, plate: e.target.value })} /><input placeholder="Bilgiler" value={form.info || ''} onChange={e => setForm({ ...form, info: e.target.value })} /></>}
      {tab === 'cities' && <><select required value={form.country_id || ''} onChange={e => setForm({ ...form, country_id: e.target.value })}><option value="">Ülke seç</option>{defs.countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><input required placeholder="Şehir adı" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} /></>}
      {tab === 'expenseDefinitions' && <><input required placeholder="Masraf adı örn. Mazot" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} /><select required value={form.category || ''} onChange={e => setForm({ ...form, category: e.target.value })}><option value="">Kategori seç</option><option>Yakıt</option><option>Yol</option><option>Belge</option><option>Operasyon</option><option>Personel</option><option>Diğer</option></select><select value={form.default_currency || 'TRY'} onChange={e => setForm({ ...form, default_currency: e.target.value })}><option>TRY</option><option>EUR</option><option>USD</option></select></>}
      <button className="primary">Ekle</button>
    </form><div className="definitionList">{list.map(item => <div key={item.id}><span>{item.name || item.plate} {item.category ? `- ${item.category}` : ''} {item.default_currency ? `- ${item.default_currency}` : ''} {item.info ? `- ${item.info}` : ''}</span><button onClick={() => remove(item.id)}>Sil</button></div>)}</div></div>;
}

function Input({ value, onChange, placeholder, type = 'text' }) { return <input type={type} step="0.01" placeholder={placeholder} value={value ?? ''} onChange={e => onChange(e.target.value)} />; }
function Select({ label, value, onChange, options, textKey, fallbackKey }) { return <select value={value || ''} onChange={e => onChange(e.target.value)}><option value="">{label}</option>{options.map(o => { const text = o[textKey] || o[fallbackKey] || o.name || o.plate || 'Tanım'; return <option key={o.id} value={o.id}>{text}</option>; })}</select>; }
function ReadOnly({ label, value }) { return <div className="readonly"><span>{label}</span><b>{value}</b></div>; }

createRoot(document.getElementById('root')).render(<App />);
