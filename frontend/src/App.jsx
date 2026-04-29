import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const API = import.meta.env.VITE_API_URL || window.location.origin;

const blankTrip = {
  project_id: '', project_name: '', load_type: '', load_width: '', load_height: '', load_length: '', load_weight: '',
  tractor_tonnage: '', trailer_tonnage: '', tonnage_capacity_formula: 130000,
  start_country_id: '', start_city_id: '', unloading_country_id: '', unloading_city_id: '', end_country_id: '', end_city_id: '',
  trip_count: 1, start_km: '', end_km: '',
  domestic_start_date: '', domestic_exit_date: '', domestic_return_date: '', domestic_end_date: '',
  abroad_entry_date: '', abroad_exit_date: '', escort_goes_abroad: true,
  domestic_work_days: 0, abroad_work_days: 0,
  driver_id: '', tractor_id: '', tractor_info_id: '', trailer_id: '', trailer_info_id: '',
  escort_id: '', escort_vehicle_id: '', escort_vehicle_info_id: ''
};

const blankExpense = {
  trip_id: '', expense_definition_id: '', country_id: '', city_id: '', vehicle_type: '', fuel_status: '', liter: '',
  amount: '', currency: '', expense_date: '', note: ''
};

const blankAdvance = {
  trip_id: '', receiver_type: '', receiver_name: '', amount: '', currency: 'TRY', advance_date: '', note: ''
};

const blankAllowance = {
  trip_id: '',
  domestic_start_date: '',
  domestic_exit_date: '',
  domestic_return_date: '',
  domestic_end_date: '',
  domestic_daily_amount: '',
  domestic_currency: 'TRY',
  abroad_entry_date: '',
  abroad_exit_date: '',
  abroad_daily_amount: '',
  abroad_currency: 'EUR',
  note: ''
};

const defTabs = [
  ['allowanceDefinitions', 'Harcırah'],
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


function dateObj(value) {
  return value ? new Date(value + 'T00:00:00') : null;
}

function countSundaysInclusive(start, end) {
  const a = dateObj(start);
  const b = dateObj(end);
  if (!a || !b || b < a) return 0;
  let count = 0;
  for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === 0) count += 1;
  }
  return count;
}

function baseDaysInclusive(start, end) {
  const a = dateObj(start);
  const b = dateObj(end);
  if (!a || !b || b < a) return 0;
  return Math.round((b - a) / 86400000) + 1;
}

function baseDaysBorderRule(start, end) {
  const a = dateObj(start);
  const b = dateObj(end);
  if (!a || !b || b <= a) return 0;
  return Math.round((b - a) / 86400000);
}

function calcAllowanceDaysFromDates(values) {
  const totalTripDays = baseDaysInclusive(values.domestic_start_date, values.domestic_end_date);
  const abroadBaseDays = baseDaysBorderRule(values.abroad_entry_date, values.abroad_exit_date);
  const abroadSundays = countSundaysInclusive(values.abroad_entry_date, values.abroad_exit_date);
  const domesticBaseDays = Math.max(0, totalTripDays - abroadBaseDays);
  const domesticSundays =
    countSundaysInclusive(values.domestic_start_date, values.domestic_exit_date) +
    countSundaysInclusive(values.domestic_return_date, values.domestic_end_date);

  return {
    domesticDays: domesticBaseDays + domesticSundays,
    abroadDays: abroadBaseDays + abroadSundays,
    domesticBaseDays,
    abroadBaseDays,
    domesticSundays,
    abroadSundays
  };
}


function numberValue(value) {
  const n = Number(String(value || '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}


function cleanEmptyValues(obj) {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key, value === '' ? null : value])
  );
}



function App() {
  const [screen, setScreen] = useState('trip');
  const [defs, setDefs] = useState(null);
  const [trips, setTrips] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [allowances, setAllowances] = useState([]);
  const [trip, setTrip] = useState(blankTrip);
  const [expense, setExpense] = useState(blankExpense);
  const [advance, setAdvance] = useState(blankAdvance);
  const [allowance, setAllowance] = useState(blankAllowance);
  const [message, setMessage] = useState('');

  async function request(path, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(API + path, {
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        signal: controller.signal,
        ...options
      });

      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch (err) {
        throw new Error(`API JSON dönmedi. Endpoint: ${path}. HTTP ${res.status}. Backend adresi veya route kontrol edilmeli.`);
      }

      if (!res.ok || !json?.ok) throw new Error(json?.error || 'İşlem başarısız');
      return json.data;
    } catch (err) {
      if (err.name === 'AbortError') throw new Error(`API zaman aşımı: ${path}`);
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function safeRequest(path, fallback) {
    try {
      return await request(path);
    } catch (err) {
      console.error(path, err);
      setMessage('Bağlantı uyarısı: ' + path + ' yüklenemedi - ' + err.message);
      return fallback;
    }
  }

  async function loadAll() {
    const emptyDefinitions = {
      projects: [],
      drivers: [],
      tractors: [],
      trailers: [],
      escorts: [],
      escortVehicles: [],
      countries: [],
      cities: [],
      expenseDefinitions: [],
      allowanceDefinitions: []
    };

    try {
      const [definitions, tripList, expenseList, advanceList, allowanceList] = await Promise.all([
        safeRequest('/definitions', emptyDefinitions),
        safeRequest('/trips', []),
        safeRequest('/expenses', []),
        safeRequest('/advances', []),
        safeRequest('/allowances', [])
      ]);

      setDefs({
        projects: definitions.projects || [],
        drivers: definitions.drivers || [],
        tractors: definitions.tractors || [],
        trailers: definitions.trailers || [],
        escorts: definitions.escorts || [],
        escortVehicles: definitions.escortVehicles || [],
        countries: definitions.countries || [],
        cities: definitions.cities || [],
        expenseDefinitions: definitions.expenseDefinitions || [],
        allowanceDefinitions: definitions.allowanceDefinitions || []
      });
      setTrips(tripList || []);
      setExpenses(expenseList || []);
      setAdvances(advanceList || []);
      setAllowances(allowanceList || []);
    } catch (err) {
      console.error(err);
      setMessage('Bağlantı hatası: ' + err.message);
      setDefs(emptyDefinitions);
      setTrips([]);
      setExpenses([]);
      setAdvances([]);
      setAllowances([]);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const totalTonnage = useMemo(() => numberValue(trip.load_weight) + numberValue(trip.tractor_tonnage) + numberValue(trip.trailer_tonnage), [trip.load_weight, trip.tractor_tonnage, trip.trailer_tonnage]);
  const tonnagePercent = useMemo(() => totalTonnage / (numberValue(trip.tonnage_capacity_formula) || 130000) * 100, [totalTonnage, trip.tonnage_capacity_formula]);
  const totalTripKm = useMemo(() => Math.max(0, numberValue(trip.end_km) - numberValue(trip.start_km)), [trip.start_km, trip.end_km]);
  const tripKm = useMemo(() => totalTripKm / 2, [totalTripKm]);
  const tripAllowanceDays = useMemo(() => calcAllowanceDaysFromDates(trip), [trip.domestic_start_date, trip.domestic_exit_date, trip.domestic_return_date, trip.domestic_end_date, trip.abroad_entry_date, trip.abroad_exit_date]);
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
      const projectName = defs.projects.find(p => p.id === trip.project_id)?.name || trip.project_name || 'Projesiz Sefer';

      const payload = cleanEmptyValues({
        ...trip,
        project_name: projectName,
        total_tonnage: totalTonnage,
        tonnage_fill_percent: tonnagePercent,
        trip_km: tripKm,
        total_trip_km: totalTripKm,
        domestic_work_days: tripAllowanceDays.domesticDays,
        abroad_work_days: tripAllowanceDays.abroadDays
      });

      const saved = await request('/trips', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const nextExpense = { ...blankExpense, trip_id: saved.id };
      setExpense(nextExpense);
      setTrip(blankTrip);
      setScreen('expenses');
      setMessage('Sefer kaydedildi. Masraf ekranına geçildi.');

      // Ekran geçişini bekletmemek için liste yenilemeyi arkada çalıştır.
      loadAll().catch(err => {
        console.error(err);
        setMessage('Sefer kaydedildi ancak liste yenileme uyarısı: ' + err.message);
      });
    } catch (err) {
      console.error(err);
      alert('Sefer kaydedilemedi: ' + err.message);
    }
  }

  if (!defs) return <div className="page">Yükleniyor...</div>;

  return (
    <div className="page">
      <header className="hero">
        <h1>Yılnak &amp; Mağdenli Yurt Dışı Hesap ERP Yazılımı</h1>
        <p>Sefer bilgi girişi, tanımlar, masraf, avans, harcırah ve raporlama.</p>
      </header>
      <div className="topActions">
        <button className={screen === 'costActual' ? 'active' : ''} onClick={() => setScreen('costActual')}>Maliyet/Gerçekleşen</button>
        <button className={screen === 'report' ? 'active' : ''} onClick={() => setScreen('report')}>Rapor</button>
        <button className={screen === 'expenseSummary' ? 'active' : ''} onClick={() => setScreen('expenseSummary')}>Masraf Özeti</button>
        <button className={screen === 'trip' ? 'active' : ''} onClick={() => setScreen('trip')}>Sefer Bilgileri</button>
        <button className={screen === 'allowances' ? 'active' : ''} onClick={() => setScreen('allowances')}>Harcırah</button>
        <button className={screen === 'advances' ? 'active' : ''} onClick={() => setScreen('advances')}>Avans</button>
        <button className={screen === 'expenses' ? 'active' : ''} onClick={() => setScreen('expenses')}>Masraf</button>
        <button className={screen === 'definitions' ? 'active' : ''} onClick={() => setScreen('definitions')}>Tanımlar</button>
      </div>
      {message && <div className="message">{message}</div>}
      {screen === 'costActual' && <CostActualScreen trips={trips} expenses={expenses} advances={advances} allowances={allowances} />}
      {screen === 'report' && <ReportScreen defs={defs} trips={trips} expenses={expenses} advances={advances} allowances={allowances} />}
      {screen === 'expenseSummary' && <ExpenseSummaryScreen defs={defs} trips={trips} expenses={expenses} />}
      {screen === 'trip' && <TripScreen defs={defs} trips={trips} trip={trip} setField={setField} saveTrip={saveTrip} totalTonnage={totalTonnage} tonnagePercent={tonnagePercent} tripKm={tripKm} totalTripKm={totalTripKm} driverProjectTotalTripCount={driverProjectTotalTripCount} tripAllowanceDays={tripAllowanceDays} citiesFor={citiesFor} />}
      {screen === 'allowances' && <AllowanceScreen defs={defs} trips={trips} allowances={allowances} allowance={allowance} setAllowance={setAllowance} request={request} reload={loadAll} />}
      {screen === 'advances' && <AdvanceScreen trips={trips} advances={advances} expenses={expenses} advance={advance} setAdvance={setAdvance} request={request} reload={loadAll} />}
      {screen === 'expenses' && <ExpenseScreen defs={defs} trips={trips} expenses={expenses} expense={expense} setExpense={setExpense} request={request} reload={loadAll} />}
      {screen === 'definitions' && <Definitions defs={defs} reload={loadAll} request={request} />}
    </div>
  );
}



function tripLabel(trip) {
  if (!trip) return '-';
  return `${trip.project_name || 'Projesiz Sefer'} - ${new Date(trip.created_at).toLocaleDateString('tr-TR')}`;
}

function SimpleMoneyRows({ title, items, amountKey = 'amount', currencyKey = 'currency' }) {
  const byCurrency = moneyByCurrency(items || [], amountKey, currencyKey);
  const rows = Object.keys(byCurrency).length ? Object.entries(byCurrency) : [['TRY', 0]];
  return <div className="reportMiniBox"><h4>{title}</h4>{rows.map(([currency, amount]) => <div key={currency}><span>{currency}</span><b>{formatMoney(amount, currency)}</b></div>)}</div>;
}


function ReportScreen({ defs, trips, expenses, advances, allowances }) {
  const [selectedTripId, setSelectedTripId] = useState('');
  const selectedTrip = trips.find(t => t.id === selectedTripId) || null;
  const tripExpenses = selectedTripId ? expenses.filter(x => x.trip_id === selectedTripId) : [];
  const tripAdvances = selectedTripId ? advances.filter(x => x.trip_id === selectedTripId) : [];
  const tripAllowances = selectedTripId ? allowances.filter(x => x.trip_id === selectedTripId) : [];

  const driverName = defs.drivers.find(d => d.id === selectedTrip?.driver_id)?.name || '-';
  const escortName = defs.escorts.find(e => e.id === selectedTrip?.escort_id)?.name || '-';
  const tractorPlate = defs.tractors.find(t => t.id === selectedTrip?.tractor_id)?.plate || '-';
  const trailerPlate = defs.trailers.find(t => t.id === selectedTrip?.trailer_id)?.plate || '-';

  const fuelItems = tripExpenses.filter(isFuelExpense);
  const tollItems = tripExpenses.filter(isTollExpense);
  const roadDocItems = tripExpenses.filter(isRoadDocExpense);
  const otherItems = tripExpenses.filter(isOtherExpense);

  return <div className="card">
    <div className="screenHeader">
      <div>
        <h2>Sefer Raporu</h2>
        <p>Sefer, avans, masraf ve harcırah bilgileri tek raporda özetlenir.</p>
      </div>
    </div>

    <section className="erpSection">
      <h3>Rapor Sefer Seçimi</h3>
      <div className="grid two">
        <Select label="Sefer seç" value={selectedTripId} onChange={setSelectedTripId} options={(trips || []).map(t => ({ ...t, label: tripLabel(t) }))} textKey="label" />
        <ReadOnly label="Seçili Sefer" value={tripLabel(selectedTrip)} />
      </div>
    </section>

    <div className="reportDashboard">
      <SimpleMoneyRows title="Toplam Avans" items={tripAdvances} />
      <SimpleMoneyRows title="Toplam Masraf" items={tripExpenses} />
      <SimpleMoneyRows title="Harcırah Yurt İçi" items={tripAllowances} amountKey="domestic_total" currencyKey="domestic_currency" />
      <SimpleMoneyRows title="Harcırah Yurt Dışı" items={tripAllowances} amountKey="abroad_total" currencyKey="abroad_currency" />
    </div>

    <section className="reportSection">
      <h3>Sefer Bilgileri</h3>
      <div className="reportTable">
        <div><span>Proje</span><b>{selectedTrip?.project_name || '-'}</b></div>
        <div><span>Yük Cinsi</span><b>{selectedTrip?.load_type || '-'}</b></div>
        <div><span>Çekici Sürücüsü</span><b>{driverName}</b></div>
        <div><span>Öncü Sürücüsü</span><b>{escortName}</b></div>
        <div><span>Çekici Plaka</span><b>{tractorPlate}</b></div>
        <div><span>Dorse Plaka</span><b>{trailerPlate}</b></div>
        <div><span>Toplam Tonaj</span><b>{numberValue(selectedTrip?.total_tonnage).toLocaleString('tr-TR')}</b></div>
        <div><span>Toplam Sefer KM</span><b>{numberValue(selectedTrip?.total_trip_km).toLocaleString('tr-TR')}</b></div>
        <div><span>Yurt İçi Çalışılan Gün</span><b>{numberValue(selectedTrip?.domestic_work_days).toLocaleString('tr-TR')}</b></div>
        <div><span>Yurt Dışı Çalışılan Gün</span><b>{numberValue(selectedTrip?.abroad_work_days).toLocaleString('tr-TR')}</b></div>
      </div>
    </section>

    <section className="reportSection">
      <h3>Verilen Avans Tablosu</h3>
      <div className="tableWrap"><table><thead><tr><th>Alan Tipi</th><th>Alan Kişi/Firma</th><th>Tutar</th><th>Para</th><th>Tarih</th><th>Açıklama</th></tr></thead>
      <tbody>{tripAdvances.length ? tripAdvances.map(x => <tr key={x.id}><td>{x.receiver_type}</td><td>{x.receiver_name}</td><td>{x.amount}</td><td>{x.currency}</td><td>{x.advance_date || '-'}</td><td>{x.description || x.note || '-'}</td></tr>) : <tr><td colSpan="6">Avans kaydı yok.</td></tr>}</tbody></table></div>
    </section>

    <section className="reportSection">
      <h3>Masraf Özeti Tablosu</h3>
      <div className="reportMiniGrid">
        <SimpleMoneyRows title="Yakıt" items={fuelItems} />
        <SimpleMoneyRows title="Ücretli Karayolu" items={tollItems} />
        <SimpleMoneyRows title="Yol Belgesi" items={roadDocItems} />
        <SimpleMoneyRows title="Diğer Masraflar" items={otherItems} />
      </div>
      <div className="tableWrap"><table><thead><tr><th>Masraf</th><th>Kategori</th><th>Araç</th><th>Durum</th><th>Litre</th><th>Tutar</th><th>Para</th><th>Tarih</th></tr></thead>
      <tbody>{tripExpenses.length ? tripExpenses.map(x => <tr key={x.id}><td>{x.expense_name || '-'}</td><td>{x.category || '-'}</td><td>{x.vehicle_type || '-'}</td><td>{x.fuel_status || '-'}</td><td>{x.liter || '-'}</td><td>{x.amount}</td><td>{x.currency}</td><td>{x.expense_date || '-'}</td></tr>) : <tr><td colSpan="8">Masraf kaydı yok.</td></tr>}</tbody></table></div>
    </section>

    <section className="reportSection">
      <h3>Harcırah Özeti Tablosu</h3>
      <div className="tableWrap"><table><thead><tr><th>Tip</th><th>Yurt İçi Gün</th><th>Yurt İçi Toplam</th><th>Yurt Dışı Gün</th><th>Yurt Dışı Toplam</th></tr></thead>
      <tbody>{tripAllowances.length ? tripAllowances.map(x => <tr key={x.id}><td>Şoför Harcırah</td><td>{x.domestic_days}</td><td>{x.domestic_total} {x.domestic_currency}</td><td>{x.abroad_days}</td><td>{x.abroad_total} {x.abroad_currency}</td></tr>) : <tr><td colSpan="5">Harcırah otomatik bilgi ekranından hesaplanır. Manuel kayıt yok.</td></tr>}</tbody></table></div>
    </section>
  </div>;
}

function CostActualScreen() {
  return <div className="card">
    <div className="screenHeader">
      <div>
        <h2>Maliyet / Gerçekleşen</h2>
        <p>Bu ekran için gönderilecek görsele göre tasarım yapılacak.</p>
      </div>
    </div>
    <div className="emptyState">
      <h3>Beklemede</h3>
      <p>Maliyet/Gerçekleşen ekranı şimdilik boş bırakıldı.</p>
    </div>
  </div>;
}

function TripScreen({ defs, trips, trip, setField, saveTrip, totalTonnage, tonnagePercent, tripKm, totalTripKm, driverProjectTotalTripCount, tripAllowanceDays, citiesFor }) {
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

          <section><h3>Sefer Tarihleri</h3><div className="grid two">
            <LabeledDate label="Yurt İçi Sefer Başlangıç" value={trip.domestic_start_date} onChange={v => setField('domestic_start_date', v)} />
            <LabeledDate label="Yurt İçi Çıkış" value={trip.domestic_exit_date} onChange={v => setField('domestic_exit_date', v)} />
            <LabeledDate label="Yurt İçi Giriş" value={trip.domestic_return_date} onChange={v => setField('domestic_return_date', v)} />
            <LabeledDate label="Yurt İçi Sefer Bitiş" value={trip.domestic_end_date} onChange={v => setField('domestic_end_date', v)} />
            <LabeledDate label="Yurt Dışı Giriş" value={trip.abroad_entry_date} onChange={v => setField('abroad_entry_date', v)} />
            <LabeledDate label="Yurt Dışı Çıkış" value={trip.abroad_exit_date} onChange={v => setField('abroad_exit_date', v)} />
            <label className="labeledField"><span>Öncü Yurt Dışına Çıkıyor mu?</span><select value={String(trip.escort_goes_abroad ?? true)} onChange={e => setField('escort_goes_abroad', e.target.value === 'true')}><option value="true">Evet</option><option value="false">Hayır</option></select></label>
            <ReadOnly label="Yurt İçi Çalışılan Gün" value={tripAllowanceDays.domesticDays.toLocaleString('tr-TR')} />
            <ReadOnly label="Yurt Dışı Çalışılan Gün" value={tripAllowanceDays.abroadDays.toLocaleString('tr-TR')} />
          </div><p className="hint">Kural: Pazar günleri çift sayılır. Yurda giriş günü yurt içi harcırahına dahildir.</p></section>

          <button className="primary" type="submit">Seferi Kaydet ve Masrafa Geç</button>
        </form>
      </main>
    </div>
  );
}

function ExpenseScreen({ defs, trips, expenses, expense, setExpense, request, reload }) {
  const selectedDef = defs.expenseDefinitions.find(x => x.id === expense.expense_definition_id);
  const isFuel = selectedDef?.category === 'Yakıt';
  const needsFuelStatus = isFuel && expense.vehicle_type === 'Çekici';
  const needsLiter = isFuel;
  const summary = expenses.reduce((acc, item) => {
    const amount = numberValue(item.amount); acc.total += amount;
    if (item.category === 'Yakıt') {
      acc.fuel += amount;
      if (item.fuel_status === 'Boş') acc.emptyLiter += numberValue(item.liter);
      if (item.fuel_status === 'Dolu') acc.loadedLiter += numberValue(item.liter);
    }
    return acc;
  }, { total: 0, fuel: 0, emptyLiter: 0, loadedLiter: 0 });

  function setExpenseField(name, value) {
    setExpense(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'expense_definition_id') {
        const def = defs.expenseDefinitions.find(x => x.id === value);
        next.currency = def?.default_currency || next.currency || 'TRY';
        if (def?.category !== 'Yakıt') { next.fuel_status = ''; next.liter = ''; }
      }
      if (name === 'vehicle_type' && value !== 'Çekici') next.fuel_status = '';
      return next;
    });
  }

  async function saveExpense(e) {
    e.preventDefault();
    try {
      if (!expense.trip_id) return alert('Sefer seçiniz.');
      if (!expense.expense_definition_id) return alert('Masraf türü seçiniz.');
      if (!expense.amount) return alert('Tutar giriniz.');
      if (needsFuelStatus && !expense.fuel_status) return alert('Çekici yakıtı için Boş/Dolu seçiniz.');
      if (needsLiter && !expense.liter) return alert('Yakıt için litre giriniz.');

      const payload = cleanEmptyValues({
        ...expense,
        city_id: null,
        fuel_status: needsFuelStatus ? expense.fuel_status : ''
      });

      await request('/expenses', { method: 'POST', body: JSON.stringify(payload) });
      setExpense({ ...blankExpense, trip_id: expense.trip_id });
      await reload();
      alert('Masraf eklendi');
    } catch (err) {
      console.error(err);
      alert('Masraf kaydedilemedi: ' + err.message);
    }
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
          <select value={expense.vehicle_type || ''} onChange={e => setExpenseField('vehicle_type', e.target.value)}><option value="">Araç tipi</option><option>Çekici</option><option>Öncü</option><option>Diğer</option></select>
        </div>

        {isFuel && <div className="fuelBox">
          {needsFuelStatus && <>
            <b>Yakıt Durumu</b>
            <label><input type="radio" name="fuel_status" checked={expense.fuel_status === 'Boş'} onChange={() => setExpenseField('fuel_status', 'Boş')} /> Boş</label>
            <label><input type="radio" name="fuel_status" checked={expense.fuel_status === 'Dolu'} onChange={() => setExpenseField('fuel_status', 'Dolu')} /> Dolu</label>
          </>}
          {!needsFuelStatus && <b>Yakıt Durumu: Öncü / Diğer araç için Boş-Dolu seçilmez</b>}
          <input type="number" step="0.01" placeholder="Litre" value={expense.liter || ''} onChange={e => setExpenseField('liter', e.target.value)} />
        </div>}

        <div className="grid two expenseBottom">
          <input required type="number" step="0.01" placeholder="Tutar" value={expense.amount || ''} onChange={e => setExpenseField('amount', e.target.value)} />
          <select value={expense.currency || selectedDef?.default_currency || 'TRY'} onChange={e => setExpenseField('currency', e.target.value)}><option>TRY</option><option>EUR</option><option>USD</option></select>
          <input type="date" value={expense.expense_date || ''} onChange={e => setExpenseField('expense_date', e.target.value)} />
          <input placeholder="Açıklama" value={expense.note || ''} onChange={e => setExpenseField('note', e.target.value)} />
        </div>
        <button className="primary" type="submit">Masraf Ekle</button>
      </form>
      <h3>Girilen Masraflar</h3><div className="tableWrap"><table><thead><tr><th>Masraf</th><th>Kategori</th><th>Ülke</th><th>Araç</th><th>Durum</th><th>Litre</th><th>Tutar</th><th>Para</th><th>Tarih</th></tr></thead><tbody>{expenses.map(x => <tr key={x.id}><td>{x.expense_name}</td><td>{x.category}</td><td>{x.country_name || '-'}</td><td>{x.vehicle_type || '-'}</td><td>{x.fuel_status || '-'}</td><td>{x.liter || '-'}</td><td>{x.amount}</td><td>{x.currency}</td><td>{x.expense_date || '-'}</td></tr>)}</tbody></table></div>
    </main>
  </div>;
}





function normalizeText(value) {
  return String(value || '').toLocaleLowerCase('tr-TR');
}

function isNameLike(item, words) {
  const text = normalizeText([item.expense_name, item.category, item.note].join(' '));
  return words.some(w => text.includes(normalizeText(w)));
}

function isFuelExpense(item) {
  return normalizeText(item.category) === 'yakıt' || isNameLike(item, ['mazot', 'yakıt', 'fuel', 'diesel']);
}

function isTollExpense(item) {
  return isNameLike(item, ['otoban', 'otoyol', 'karayolu', 'geçiş', 'toll', 'ücretli']);
}

function isRoadDocExpense(item) {
  return isNameLike(item, ['yol belge', 'belge', 'permit', 'izin']);
}

function isScaleCustomsExpense(item) {
  return isNameLike(item, ['kantar', 'gümrük', 'tescil']);
}

function isOtherExpense(item) {
  return !isFuelExpense(item) && !isTollExpense(item) && !isRoadDocExpense(item) && !isScaleCustomsExpense(item);
}

function vehicleGroup(item) {
  const text = normalizeText(item.vehicle_type || item.note || '');
  if (text.includes('öncü') || text.includes('oncu')) return 'escort';
  return 'tractor';
}

function regionGroup(item) {
  const country = normalizeText(item.country_name || item.country || '');
  if (!country) return 'unknown';
  return country.includes('türkiye') || country.includes('turkiye') || country.includes('tr') ? 'domestic' : 'abroad';
}

function currencyOf(item) {
  return String(item.currency || 'TRY').toUpperCase();
}

function sumAmount(items, currency = null) {
  return items
    .filter(x => !currency || currencyOf(x) === currency)
    .reduce((s, x) => s + numberValue(x.amount), 0);
}

function sumLiter(items) {
  return items.reduce((s, x) => s + numberValue(x.liter), 0);
}

function formatMoney(value, currency) {
  return `${numberValue(value).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function formatNumber(value, digits = 2) {
  return numberValue(value).toLocaleString('tr-TR', { maximumFractionDigits: digits });
}

function ExpenseSummaryRow({ label, value, highlight }) {
  return <div className={highlight ? 'summaryRow highlight' : 'summaryRow'}><span>{label}</span><b>{value}</b></div>;
}

function SummaryBox({ title, children, tone = '' }) {
  return <section className={`expenseSummaryBox ${tone}`}>
    <h3>{title}</h3>
    <div className="summaryRows">{children}</div>
  </section>;
}



function ExpenseSummaryScreen({ defs, trips, expenses }) {
  const [selectedTripId, setSelectedTripId] = useState('');
  const [selectedOtherIds, setSelectedOtherIds] = useState([]);
  const selectedTrip = trips.find(t => t.id === selectedTripId) || null;
  const tripExpenses = selectedTripId ? expenses.filter(x => x.trip_id === selectedTripId) : [];

  const totalTripKm = numberValue(selectedTrip?.total_trip_km);
  const fuel = tripExpenses.filter(isFuelExpense);
  const tractorFuel = fuel.filter(x => vehicleGroup(x) === 'tractor');
  const escortFuel = fuel.filter(x => vehicleGroup(x) === 'escort');
  const emptyFuel = tractorFuel.filter(x => x.fuel_status === 'Boş');
  const loadedFuel = tractorFuel.filter(x => x.fuel_status === 'Dolu');

  const tolls = tripExpenses.filter(isTollExpense);
  const tractorTolls = tolls.filter(x => vehicleGroup(x) === 'tractor');
  const escortTolls = tolls.filter(x => vehicleGroup(x) === 'escort');
  const roadDocs = tripExpenses.filter(isRoadDocExpense);
  const otherItems = tripExpenses.filter(x => !isFuelExpense(x) && !isTollExpense(x) && !isRoadDocExpense(x));

  const currencies = Array.from(new Set(['TRY', 'EUR', 'USD', ...tripExpenses.map(currencyOf)]));
  const totalFuelLiters = sumLiter(fuel);
  const tractorFuelLiters = sumLiter(tractorFuel);
  const emptyPercent = tractorFuelLiters > 0 ? (sumLiter(emptyFuel) / tractorFuelLiters) * 100 : 0;
  const loadedPercent = tractorFuelLiters > 0 ? (sumLiter(loadedFuel) / tractorFuelLiters) * 100 : 0;
  const tractorAverage = totalTripKm > 0 ? (tractorFuelLiters / totalTripKm) * 100 : 0;
  const selectedOtherItems = otherItems.filter(x => selectedOtherIds.includes(x.id));

  function totalsByCurrency(items) {
    return currencies
      .map(c => ({ currency: c, amount: sumAmount(items, c) }))
      .filter(x => x.amount > 0);
  }

  function moneyList(items) {
    const rows = totalsByCurrency(items);
    return rows.length ? rows.map(x => formatMoney(x.amount, x.currency)).join(' / ') : '0';
  }

  function percent(value) {
    return `${numberValue(value).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}%`;
  }

  function regionItems(items, region) {
    return items.filter(x => regionGroup(x) === region);
  }

  function toggleOther(id) {
    setSelectedOtherIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function otherRows() {
    if (!otherItems.length) return <tr><td colSpan="8">Kayıt yok.</td></tr>;
    return otherItems.map(x => <tr key={x.id}>
      <td><input type="checkbox" checked={selectedOtherIds.includes(x.id)} onChange={() => toggleOther(x.id)} /></td>
      <td>{x.expense_name || '-'}</td><td>{x.category || '-'}</td><td>{x.vehicle_type || '-'}</td><td>{x.country_name || '-'}</td><td>{x.amount}</td><td>{x.currency}</td><td>{x.expense_date || '-'}</td>
    </tr>);
  }

  return <div className="layout">
    <aside className="sideCard">
      <h3>Masraf Özeti</h3>
      <Select label="Sefer seç" value={selectedTripId} onChange={setSelectedTripId} options={(trips || []).map(t => ({ ...t, label: (t.project_name || 'Projesiz') + ' - ' + new Date(t.created_at).toLocaleDateString('tr-TR') }))} textKey="label" />
      <div className="summaryGrid">
        <div><span>Toplam Sefer KM</span><b>{totalTripKm.toLocaleString('tr-TR')}</b></div>
        <div><span>Çekici Yakıt LT</span><b>{formatNumber(tractorFuelLiters)}</b></div>
        <div><span>Öncü Yakıt LT</span><b>{formatNumber(sumLiter(escortFuel))}</b></div>
        <div><span>Kayıt Sayısı</span><b>{tripExpenses.length}</b></div>
      </div>
      <p className="hint">Para birimi sabit değildir. Girilen masraf hangi para birimindeyse özetlerde o şekilde gruplanır.</p>
    </aside>

    <main className="card">
      <div className="screenHeader">
        <div>
          <h2>Masraf Özeti</h2>
          <p>10 tablo; çekici, öncü, yakıt, otoyol, yol belgesi ve diğer masraflar ERP formatında özetlenir.</p>
        </div>
      </div>

      {!selectedTrip && <div className="message">Sefer seçilmedi. Tablolar 0 değerlerle gösteriliyor.</div>}

      <h3 className="summaryMainTitle">Çekici Yakıt</h3>
      <div className="cleanSummaryGrid">
        <SummaryBox title="Boş Yakıt">
          <ExpenseSummaryRow label="Boş Yurt İçi Yakıt (lt)" value={formatNumber(sumLiter(regionItems(emptyFuel, 'domestic')))} />
          <ExpenseSummaryRow label="Boş Yurt İçi Yakıt Tutarı" value={moneyList(regionItems(emptyFuel, 'domestic'))} />
          <ExpenseSummaryRow label="Boş Yurt Dışı Yakıt (lt)" value={formatNumber(sumLiter(regionItems(emptyFuel, 'abroad')))} />
          <ExpenseSummaryRow label="Boş Yurt Dışı Yakıt Tutarı" value={moneyList(regionItems(emptyFuel, 'abroad'))} />
          <ExpenseSummaryRow label="Toplam Boş Yakıt (lt)" value={formatNumber(sumLiter(emptyFuel))} highlight />
          <ExpenseSummaryRow label="Toplam Boş Yakıt Maliyeti" value={moneyList(emptyFuel)} highlight />
          <ExpenseSummaryRow label="Boş Yakıt (%)" value={percent(emptyPercent)} highlight />
        </SummaryBox>

        <SummaryBox title="Dolu Yakıt">
          <ExpenseSummaryRow label="Dolu Yurt İçi Yakıt (lt)" value={formatNumber(sumLiter(regionItems(loadedFuel, 'domestic')))} />
          <ExpenseSummaryRow label="Dolu Yurt İçi Yakıt Tutarı" value={moneyList(regionItems(loadedFuel, 'domestic'))} />
          <ExpenseSummaryRow label="Dolu Yurt Dışı Yakıt (lt)" value={formatNumber(sumLiter(regionItems(loadedFuel, 'abroad')))} />
          <ExpenseSummaryRow label="Dolu Yurt Dışı Yakıt Tutarı" value={moneyList(regionItems(loadedFuel, 'abroad'))} />
          <ExpenseSummaryRow label="Toplam Dolu Yakıt (lt)" value={formatNumber(sumLiter(loadedFuel))} highlight />
          <ExpenseSummaryRow label="Toplam Dolu Yakıt Maliyeti" value={moneyList(loadedFuel)} highlight />
          <ExpenseSummaryRow label="Dolu Yakıt (%)" value={percent(loadedPercent)} highlight />
        </SummaryBox>

        <SummaryBox title="Çekici Yakıt Ortalaması">
          <ExpenseSummaryRow label="Çekici Yakıt Ortalaması (%)" value={percent(tractorAverage)} highlight />
          <ExpenseSummaryRow label="Çekici Toplam Yakıt (lt)" value={formatNumber(tractorFuelLiters)} />
          <ExpenseSummaryRow label="Çekici Toplam Yakıt Maliyeti" value={moneyList(tractorFuel)} highlight />
          <ExpenseSummaryRow label="Dolu + Boş Maliyet" value={moneyList([...loadedFuel, ...emptyFuel])} highlight />
        </SummaryBox>

        <SummaryBox title="Öncü Yakıt">
          <ExpenseSummaryRow label="Yurt İçi Yakıt (lt)" value={formatNumber(sumLiter(regionItems(escortFuel, 'domestic')))} />
          <ExpenseSummaryRow label="Yurt İçi Yakıt Tutarı" value={moneyList(regionItems(escortFuel, 'domestic'))} />
          <ExpenseSummaryRow label="Yurt Dışı Yakıt (lt)" value={formatNumber(sumLiter(regionItems(escortFuel, 'abroad')))} />
          <ExpenseSummaryRow label="Yurt Dışı Yakıt Tutarı" value={moneyList(regionItems(escortFuel, 'abroad'))} />
          <ExpenseSummaryRow label="Yakıt Toplam" value={moneyList(escortFuel)} highlight />
        </SummaryBox>

        <SummaryBox title="Yakıt Maliyet">
          <ExpenseSummaryRow label="Yurt İçi Yakıt" value={moneyList(regionItems(fuel, 'domestic'))} />
          <ExpenseSummaryRow label="Yurt Dışı Yakıt" value={moneyList(regionItems(fuel, 'abroad'))} />
          <ExpenseSummaryRow label="Çekici Yakıt Toplam" value={moneyList(tractorFuel)} />
          <ExpenseSummaryRow label="Öncü Yakıt Toplam" value={moneyList(escortFuel)} />
          <ExpenseSummaryRow label="Yakıt Toplam" value={moneyList(fuel)} highlight />
        </SummaryBox>

        <SummaryBox title="Çekici Ücretli Otoyol">
          <ExpenseSummaryRow label="Yurt İçi Otoyol Geçiş" value={moneyList(regionItems(tractorTolls, 'domestic'))} />
          <ExpenseSummaryRow label="Yurt Dışı Otoyol Geçiş" value={moneyList(regionItems(tractorTolls, 'abroad'))} />
          <ExpenseSummaryRow label="Otoyol Geçiş Toplam" value={moneyList(tractorTolls)} highlight />
        </SummaryBox>

        <SummaryBox title="Öncü Ücretli Otoyol">
          <ExpenseSummaryRow label="Yurt İçi Otoyol Geçiş" value={moneyList(regionItems(escortTolls, 'domestic'))} />
          <ExpenseSummaryRow label="Yurt Dışı Otoyol Geçiş" value={moneyList(regionItems(escortTolls, 'abroad'))} />
          <ExpenseSummaryRow label="Otoyol Geçiş Toplam" value={moneyList(escortTolls)} highlight />
        </SummaryBox>

        <SummaryBox title="Ücretli Otoyol Maliyet">
          <ExpenseSummaryRow label="Yurt İçi Otoyol Geçiş" value={moneyList(regionItems(tolls, 'domestic'))} />
          <ExpenseSummaryRow label="Yurt Dışı Otoyol Geçiş" value={moneyList(regionItems(tolls, 'abroad'))} />
          <ExpenseSummaryRow label="Otoyol Geçiş Toplam" value={moneyList(tolls)} highlight />
        </SummaryBox>

        <SummaryBox title="Yol Belgesi">
          <ExpenseSummaryRow label="Yol Belge Maliyeti - Yurt İçi" value={moneyList(regionItems(roadDocs, 'domestic'))} />
          <ExpenseSummaryRow label="Yol Belge Maliyeti - Yurt Dışı" value={moneyList(regionItems(roadDocs, 'abroad'))} />
          <ExpenseSummaryRow label="Yol Belgesi Toplam Maliyet" value={moneyList(roadDocs)} highlight />
        </SummaryBox>

        <section className="expenseSummaryBox wide">
          <div className="sectionTitleRow">
            <h3>Diğer Masraflar</h3>
            <button className="ghost" type="button" onClick={() => setSelectedOtherIds(otherItems.map(x => x.id))}>Tümünü seç</button>
          </div>
          <div className="tableWrap">
            <table>
              <thead><tr><th>Seç</th><th>Masraf</th><th>Kategori</th><th>Araç</th><th>Ülke</th><th>Tutar</th><th>Para</th><th>Tarih</th></tr></thead>
              <tbody>{otherRows()}</tbody>
            </table>
          </div>
          <div className="summaryRows otherMergeTotal">
            <ExpenseSummaryRow label="Seçili Diğer Masraflar Birleşik Toplam" value={moneyList(selectedOtherItems)} highlight />
            <ExpenseSummaryRow label="Tüm Diğer Masraflar Toplam" value={moneyList(otherItems)} />
          </div>
        </section>
      </div>
    </main>
  </div>;
}


function moneyByCurrency(items, amountKey = 'amount', currencyKey = 'currency') {
  return (items || []).reduce((acc, item) => {
    const currency = (item[currencyKey] || 'TRY').toUpperCase();
    acc[currency] = (acc[currency] || 0) + numberValue(item[amountKey]);
    return acc;
  }, {});
}

function AdvanceScreen({ trips, advances, expenses, advance, setAdvance, request, reload }) {
  const selectedTripId = advance.trip_id || '';
  const tripExpenses = selectedTripId ? expenses.filter(x => x.trip_id === selectedTripId) : [];
  const tripAdvances = selectedTripId ? advances.filter(x => x.trip_id === selectedTripId) : advances;

  const expenseByCurrency = moneyByCurrency(tripExpenses, 'amount', 'currency');
  const advanceByCurrency = moneyByCurrency(tripAdvances, 'amount', 'currency');
  const enteredCurrency = (advance.currency || 'TRY').toUpperCase();
  const enteredAmount = numberValue(advance.amount);

  const currencies = Array.from(new Set(['TRY', 'EUR', 'USD', ...Object.keys(expenseByCurrency), ...Object.keys(advanceByCurrency), enteredCurrency]));
  const balances = currencies.map(currency => {
    const expenseTotal = expenseByCurrency[currency] || 0;
    const currentAdvanceTotal = advanceByCurrency[currency] || 0;
    const afterAdvanceTotal = currentAdvanceTotal + (currency === enteredCurrency ? enteredAmount : 0);
    const currentBalance = currentAdvanceTotal - expenseTotal;
    const afterBalance = afterAdvanceTotal - expenseTotal;
    return { currency, expenseTotal, currentAdvanceTotal, afterAdvanceTotal, currentBalance, afterBalance };
  });

  const selectedCurrencyBalance = balances.find(x => x.currency === enteredCurrency) || { afterBalance: enteredAmount };

  function setAdvanceField(name, value) {
    setAdvance(prev => ({ ...prev, [name]: value }));
  }

  async function saveAdvance(e) {
    e.preventDefault();
    if (!advance.trip_id) return alert('Sefer seçiniz.');
    if (!advance.receiver_type) return alert('Avans alan tipini seçiniz.');
    if (!advance.receiver_name) return alert('Avans alan kişi/adı giriniz.');
    if (!advance.amount || numberValue(advance.amount) <= 0) return alert('Tutar 0’dan büyük olmalı.');
    if (!advance.currency) return alert('Para birimi seçiniz.');

    const after = selectedCurrencyBalance.afterBalance;
    const msg = after > 0
      ? `Bu kayıt sonrası ${enteredCurrency} bakiyesinde şoförde/kişide ${after.toLocaleString('tr-TR')} ${enteredCurrency} kalacak. Kaydedilsin mi?`
      : after < 0
        ? `Bu kayıt sonrası ${enteredCurrency} bakiyesinde firma personele ${Math.abs(after).toLocaleString('tr-TR')} ${enteredCurrency} borçlu görünecek. Kaydedilsin mi?`
        : `Bu kayıt sonrası ${enteredCurrency} bakiyesi sıfırlanacak. Kaydedilsin mi?`;

    if (!confirm(msg)) return;

    await request('/advances', { method: 'POST', body: JSON.stringify(advance) });
    setAdvance({ ...blankAdvance, trip_id: advance.trip_id, currency: advance.currency || 'TRY' });
    await reload();
    alert('Avans eklendi');
  }

  return <div className="layout">
    <aside className="sideCard"><h3>Avans / Masraf Bakiye Kontrolü</h3>
      <p className="hint">Bakiye hesabı seçili sefere ve para birimine göre ayrı yapılır.</p>
      <div className="currencyBalanceList">
        {balances.map(row => {
          const label = row.afterBalance > 0 ? 'Şoförde / kişide kalan' : row.afterBalance < 0 ? 'Firmadan alacak' : 'Kapandı';
          const cls = row.afterBalance > 0 ? 'ok' : row.afterBalance < 0 ? 'warn' : 'closed';
          return <div className={`currencyBalance ${cls}`} key={row.currency}>
            <div className="currencyHeader">{row.currency}</div>
            <div><span>Masraf</span><b>{row.expenseTotal.toLocaleString('tr-TR')} {row.currency}</b></div>
            <div><span>Mevcut Avans</span><b>{row.currentAdvanceTotal.toLocaleString('tr-TR')} {row.currency}</b></div>
            <div><span>Kayıt Sonrası Avans</span><b>{row.afterAdvanceTotal.toLocaleString('tr-TR')} {row.currency}</b></div>
            <div><span>{label}</span><b>{Math.abs(row.afterBalance).toLocaleString('tr-TR')} {row.currency}</b></div>
          </div>;
        })}
      </div>
    </aside>
    <main className="card"><h2>Avans Girişi</h2>
      <form onSubmit={saveAdvance}>
        <div className="grid two">
          <Select label="Sefer seç" value={advance.trip_id} onChange={v => setAdvanceField('trip_id', v)} options={trips.map(t => ({ ...t, label: (t.project_name || 'Projesiz') + ' - ' + new Date(t.created_at).toLocaleDateString('tr-TR') }))} textKey="label" />
          <select required value={advance.receiver_type || ''} onChange={e => setAdvanceField('receiver_type', e.target.value)}>
            <option value="">Avans alan tipi</option><option>Şoför</option><option>Öncü</option><option>Taşeron</option><option>Diğer</option>
          </select>
          <input required placeholder="Avans alan kişi / firma" value={advance.receiver_name || ''} onChange={e => setAdvanceField('receiver_name', e.target.value)} />
          <input required type="number" min="0.01" step="0.01" placeholder="Tutar" value={advance.amount || ''} onChange={e => setAdvanceField('amount', e.target.value)} />
          <select required value={advance.currency || 'TRY'} onChange={e => setAdvanceField('currency', e.target.value)}><option>TRY</option><option>EUR</option><option>USD</option></select>
          <input type="date" value={advance.advance_date || ''} onChange={e => setAdvanceField('advance_date', e.target.value)} />
          <input placeholder="Açıklama" value={advance.note || ''} onChange={e => setAdvanceField('note', e.target.value)} />
        </div>
        <button className="primary" type="submit">Avans Ekle</button>
      </form>
      <h3>Seçili Sefer Avansları</h3><div className="tableWrap"><table><thead><tr><th>Sefer</th><th>Alan Tipi</th><th>Alan Kişi/Firma</th><th>Tutar</th><th>Para</th><th>Tarih</th><th>Açıklama</th></tr></thead><tbody>{tripAdvances.map(x => <tr key={x.id}><td>{x.trip_name || '-'}</td><td>{x.receiver_type}</td><td>{x.receiver_name}</td><td>{x.amount}</td><td>{x.currency}</td><td>{x.advance_date || '-'}</td><td>{x.note || x.description || '-'}</td></tr>)}</tbody></table></div>
    </main>
  </div>;
}


function daysBetweenInclusive(start, end) {
  if (!start || !end) return 0;
  const a = new Date(start + 'T00:00:00');
  const b = new Date(end + 'T00:00:00');
  const diff = Math.round((b - a) / 86400000) + 1;
  return diff > 0 ? diff : 0;
}

function daysBetweenBorderRule(start, end) {
  if (!start || !end) return 0;
  const a = new Date(start + 'T00:00:00');
  const b = new Date(end + 'T00:00:00');
  const diff = Math.round((b - a) / 86400000);
  return diff > 0 ? diff : 0;
}



function formatDateForInput(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}



function AllowanceSummaryTable({ title, personName, dates, daily, currency, includeAbroad }) {
  const days = calcAllowanceDaysFromDates(dates);
  const domesticDays = includeAbroad ? days.domesticDays : baseDaysInclusive(dates.domestic_start_date, dates.domestic_end_date) + countSundaysInclusive(dates.domestic_start_date, dates.domestic_end_date);
  const abroadDays = includeAbroad ? days.abroadDays : 0;
  const domesticTotal = domesticDays * numberValue(daily.domestic);
  const abroadTotal = abroadDays * numberValue(daily.abroad);

  return <section className="erpSection allowanceInfoCard">
    <div className="allowancePersonHeader">
      <div>
        <h3>{title}</h3>
        <p>{personName || 'Tanımlı personel yok'}</p>
      </div>
      <div className={includeAbroad ? 'statusPill ok' : 'statusPill warn'}>{includeAbroad ? 'Yurt dışı dahil' : 'Yurt dışı yok'}</div>
    </div>

    <div className="allowanceInfoGrid">
      <div className="allowanceInfoBlock">
        <h4>Yurt İçi Tarihleri</h4>
        <div className="infoRows">
          <div><span>Yurt İçi Sefer Başlangıç</span><b>{dates.domestic_start_date || '-'}</b></div>
          <div><span>Yurt İçi Çıkış</span><b>{dates.domestic_exit_date || '-'}</b></div>
          <div><span>Yurt İçi Giriş</span><b>{dates.domestic_return_date || '-'}</b></div>
          <div><span>Yurt İçi Sefer Bitiş</span><b>{dates.domestic_end_date || '-'}</b></div>
          <div><span>Yurt İçi Geçen Gün</span><b>{domesticDays.toLocaleString('tr-TR')}</b></div>
          <div><span>Günlük Harcırah</span><b>{numberValue(daily.domestic).toLocaleString('tr-TR')} {currency.domestic}</b></div>
          <div className="totalRow"><span>Yurt İçi Harcırah</span><b>{domesticTotal.toLocaleString('tr-TR')} {currency.domestic}</b></div>
        </div>
      </div>

      <div className="allowanceInfoBlock">
        <h4>Yurt Dışı Tarihleri</h4>
        <div className="infoRows">
          <div><span>Yurt Dışı Giriş</span><b>{includeAbroad ? (dates.abroad_entry_date || '-') : '-'}</b></div>
          <div><span>Yurt Dışı Çıkış</span><b>{includeAbroad ? (dates.abroad_exit_date || '-') : '-'}</b></div>
          <div><span>Yurt Dışı Geçen Gün</span><b>{abroadDays.toLocaleString('tr-TR')}</b></div>
          <div><span>Günlük Harcırah</span><b>{includeAbroad ? `${numberValue(daily.abroad).toLocaleString('tr-TR')} ${currency.abroad}` : `0 ${currency.abroad}`}</b></div>
          <div className="totalRow"><span>Yurt Dışı Harcırah</span><b>{abroadTotal.toLocaleString('tr-TR')} {currency.abroad}</b></div>
        </div>
      </div>
    </div>
  </section>;
}

function AllowanceScreen({ defs, trips, allowances, allowance, setAllowance, request, reload }) {
  const safeDefs = defs || { allowanceDefinitions: [], drivers: [], escorts: [] };
  const allowanceDefinitions = safeDefs.allowanceDefinitions || [];
  const activeAllowanceDef = allowanceDefinitions.find(x => x.is_active) || allowanceDefinitions[0] || null;
  const selectedTrip = (trips || []).find(t => t.id === allowance.trip_id) || null;

  const tripDates = {
    domestic_start_date: formatDateForInput(selectedTrip?.domestic_start_date),
    domestic_exit_date: formatDateForInput(selectedTrip?.domestic_exit_date),
    domestic_return_date: formatDateForInput(selectedTrip?.domestic_return_date),
    domestic_end_date: formatDateForInput(selectedTrip?.domestic_end_date),
    abroad_entry_date: formatDateForInput(selectedTrip?.abroad_entry_date),
    abroad_exit_date: formatDateForInput(selectedTrip?.abroad_exit_date)
  };

  const daily = {
    domestic: activeAllowanceDef?.domestic_daily_amount || 0,
    abroad: activeAllowanceDef?.abroad_daily_amount || 0
  };

  const currency = {
    domestic: activeAllowanceDef?.domestic_currency || 'TRY',
    abroad: activeAllowanceDef?.abroad_currency || 'EUR'
  };

  const tractorDriverName = safeDefs.drivers?.find(d => d.id === selectedTrip?.driver_id)?.name || '';
  const escortDriverName = safeDefs.escorts?.find(e => e.id === selectedTrip?.escort_id)?.name || '';
  const escortGoesAbroad = selectedTrip?.escort_goes_abroad !== false;

  const tractorDays = calcAllowanceDaysFromDates(tripDates);
  const tractorDomesticTotal = tractorDays.domesticDays * numberValue(daily.domestic);
  const tractorAbroadTotal = tractorDays.abroadDays * numberValue(daily.abroad);

  const escortDomesticDays = escortGoesAbroad
    ? tractorDays.domesticDays
    : baseDaysInclusive(tripDates.domestic_start_date, tripDates.domestic_end_date) + countSundaysInclusive(tripDates.domestic_start_date, tripDates.domestic_end_date);
  const escortAbroadDays = escortGoesAbroad ? tractorDays.abroadDays : 0;
  const escortDomesticTotal = escortDomesticDays * numberValue(daily.domestic);
  const escortAbroadTotal = escortAbroadDays * numberValue(daily.abroad);

  const totalsByCurrency = [
    { currency: currency.domestic, label: 'Toplam Yurt İçi Harcırah', amount: tractorDomesticTotal + escortDomesticTotal },
    { currency: currency.abroad, label: 'Toplam Yurt Dışı Harcırah', amount: tractorAbroadTotal + escortAbroadTotal }
  ];

  function setAllowanceField(name, value) {
    setAllowance(prev => ({ ...prev, [name]: value }));
  }

  return <div className="layout">
    <aside className="sideCard">
      <h3>Otomatik Harcırah Özeti</h3>
      <div className="summaryGrid">
        <div><span>Çekici Yurt İçi Gün</span><b>{tractorDays.domesticDays}</b></div>
        <div><span>Çekici Yurt Dışı Gün</span><b>{tractorDays.abroadDays}</b></div>
        <div><span>Öncü Yurt İçi Gün</span><b>{escortDomesticDays}</b></div>
        <div><span>Öncü Yurt Dışı Gün</span><b>{escortAbroadDays}</b></div>
      </div>
      <div className="currencyBalanceList">
        {totalsByCurrency.map(row => <div className="currencyBalance closed" key={row.label + row.currency}>
          <div className="currencyHeader">{row.currency}</div>
          <div><span>{row.label}</span><b>{row.amount.toLocaleString('tr-TR')} {row.currency}</b></div>
        </div>)}
      </div>
      <p className="hint">Bu ekran bilgi ekranıdır. Harcırah tutarları ve günleri otomatik hesaplanır.</p>
      <p className="hint">Günlük tutarlar Tanımlar &gt; Harcırah ekranından gelir.</p>
      <p className="hint">Pazar günleri çift sayılır.</p>
    </aside>

    <main className="card">
      <div className="screenHeader">
        <div>
          <h2>Şoför Harcırah Hesabı</h2>
          <p>Çekici sürücüsü ve öncü sürücüsü ayrı hesaplanır. Manuel giriş yoktur.</p>
        </div>
      </div>

      <section className="erpSection">
        <h3>Sefer Seçimi</h3>
        <div className="grid two">
          <Select label="Sefer seç" value={allowance.trip_id} onChange={v => setAllowanceField('trip_id', v)} options={(trips || []).map(t => ({ ...t, label: (t.project_name || 'Projesiz') + ' - ' + new Date(t.created_at).toLocaleDateString('tr-TR') }))} textKey="label" />
          <ReadOnly label="Seçili Sefer" value={selectedTrip?.project_name || '-'} />
        </div>
      </section>

      {!selectedTrip && <div className="message">Harcırahı görmek için sefer seçiniz.</div>}

      {selectedTrip && <>
        <AllowanceSummaryTable
          title="Çekici Sürücüsü Harcırahı"
          personName={tractorDriverName}
          dates={tripDates}
          daily={daily}
          currency={currency}
          includeAbroad={true}
        />

        <AllowanceSummaryTable
          title="Öncü Sürücüsü Harcırahı"
          personName={escortDriverName}
          dates={tripDates}
          daily={daily}
          currency={currency}
          includeAbroad={escortGoesAbroad}
        />
      </>}
    </main>
  </div>;
}

function Definitions({ defs, reload, request }) {
  const [tab, setTab] = useState('expenseDefinitions');
  const [form, setForm] = useState({});
  const [editingId, setEditingId] = useState(null);

  const expenseCategories = useMemo(() => {
    const defaults = ['Yakıt', 'Yol', 'Belge', 'Operasyon', 'Personel', 'Diğer'];
    const fromDefs = (defs.expenseDefinitions || []).map(x => x.category).filter(Boolean);
    return [...new Set([...defaults, ...fromDefs])].sort((a, b) => a.localeCompare(b, 'tr'));
  }, [defs.expenseDefinitions]);

  function resetForm() {
    setForm({});
    setEditingId(null);
  }

  function edit(item) {
    setEditingId(item.id);
    setForm({ ...item });
  }

  async function save(e) {
    e.preventDefault();
    try {
      let payload = {};
      if (tab === 'allowanceDefinitions') payload = {
        name: form.name,
        domestic_daily_amount: form.domestic_daily_amount,
        domestic_currency: form.domestic_currency || 'TRY',
        abroad_daily_amount: form.abroad_daily_amount,
        abroad_currency: form.abroad_currency || 'EUR',
        is_active: form.is_active !== false
      };
      if (tab === 'expenseDefinitions') payload = {
        name: form.name,
        category: form.category,
        default_currency: form.default_currency || 'TRY'
      };
      if (tab === 'projects') payload = { name: form.name };
      if (tab === 'drivers') payload = { name: form.name };
      if (tab === 'tractors') payload = { plate: form.plate, info: form.info };
      if (tab === 'trailers') payload = { plate: form.plate, info: form.info };
      if (tab === 'escorts') payload = { name: form.name };
      if (tab === 'escortVehicles') payload = { plate: form.plate, info: form.info };
      if (tab === 'countries') payload = { name: form.name };
      if (tab === 'cities') payload = { country_id: form.country_id, name: form.name };

      const url = editingId ? `/definitions/${tab}/${editingId}` : `/definitions/${tab}`;
      const method = editingId ? 'PUT' : 'POST';

      await request(url, { method, body: JSON.stringify(payload) });
      resetForm();
      await reload();
      alert(editingId ? 'Güncellendi' : 'Eklendi');
    } catch (err) {
      alert((editingId ? 'Güncellenemedi: ' : 'Eklenemedi: ') + err.message);
    }
  }

  async function remove(id) {
    if (!confirm('Silinsin mi?')) return;
    try {
      await request(`/definitions/${tab}/${id}`, { method: 'DELETE' });
      if (editingId === id) resetForm();
      await reload();
      alert('Silindi');
    } catch (err) {
      alert('Silinemedi: ' + err.message);
    }
  }

  const list = defs[tab] || [];

  return <div className="card">
    <h2>Tanımlar</h2>
    <p className="hint">Masraf kalemleri ve kategorileri buradan eklenir, düzenlenir ve silinir.</p>

    <div className="defTabs">
      {defTabs.map(([key, label]) => (
        <button key={key} className={tab === key ? 'active' : ''} onClick={() => { setTab(key); resetForm(); }}>{label}</button>
      ))}
    </div>

    <form className="definitionForm" onSubmit={save}>
      {['projects', 'drivers', 'escorts', 'countries'].includes(tab) && (
        <input required placeholder="Ad / Tanım" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} />
      )}

      {['tractors', 'trailers', 'escortVehicles'].includes(tab) && <>
        <input required placeholder="Plaka" value={form.plate || ''} onChange={e => setForm({ ...form, plate: e.target.value })} />
        <input placeholder="Bilgiler" value={form.info || ''} onChange={e => setForm({ ...form, info: e.target.value })} />
      </>}

      {tab === 'cities' && <>
        <select required value={form.country_id || ''} onChange={e => setForm({ ...form, country_id: e.target.value })}>
          <option value="">Ülke seç</option>
          {defs.countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input required placeholder="Şehir adı" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} />
      </>}

      {tab === 'allowanceDefinitions' && <>
        <input required placeholder="Tanım adı örn. Standart Harcırah" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} />
        <input required type="number" step="0.01" placeholder="Yurt içi günlük tutar" value={form.domestic_daily_amount || ''} onChange={e => setForm({ ...form, domestic_daily_amount: e.target.value })} />
        <select value={form.domestic_currency || 'TRY'} onChange={e => setForm({ ...form, domestic_currency: e.target.value })}><option>TRY</option><option>EUR</option><option>USD</option></select>
        <input required type="number" step="0.01" placeholder="Yurt dışı günlük tutar" value={form.abroad_daily_amount || ''} onChange={e => setForm({ ...form, abroad_daily_amount: e.target.value })} />
        <select value={form.abroad_currency || 'EUR'} onChange={e => setForm({ ...form, abroad_currency: e.target.value })}><option>EUR</option><option>TRY</option><option>USD</option></select>
      </>}

      {tab === 'expenseDefinitions' && <>
        <input required placeholder="Masraf adı örn. Mazot" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} />

        <input
          required
          list="expense-category-list"
          placeholder="Kategori yaz / seç"
          value={form.category || ''}
          onChange={e => setForm({ ...form, category: e.target.value })}
        />
        <datalist id="expense-category-list">
          {expenseCategories.map(cat => <option key={cat} value={cat} />)}
        </datalist>

        <select value={form.default_currency || 'TRY'} onChange={e => setForm({ ...form, default_currency: e.target.value })}>
          <option>TRY</option><option>EUR</option><option>USD</option>
        </select>
      </>}

      <button className="primary">{editingId ? 'Güncelle' : 'Ekle'}</button>
      {editingId && <button type="button" onClick={resetForm}>Vazgeç</button>}
    </form>

    <div className="definitionList">
      {list.map(item => <div key={item.id}>
        <span>
          {item.name || item.plate}
          {item.category ? ` - ${item.category}` : ''}
          {item.default_currency ? ` - ${item.default_currency}` : ''}
          {item.info ? ` - ${item.info}` : ''}
        </span>
        <div className="definitionActions">
          <button type="button" onClick={() => edit(item)}>Düzenle</button>
          <button type="button" onClick={() => remove(item.id)}>Sil</button>
        </div>
      </div>)}
    </div>
  </div>;
}

function LabeledDate({ label, value, onChange }) {
  return <label className="labeledField"><span>{label}</span><input type="date" value={value || ''} onChange={e => onChange(e.target.value)} /></label>;
}

function Input({ value, onChange, placeholder, type = 'text' }) { return <input type={type} step="0.01" placeholder={placeholder} value={value ?? ''} onChange={e => onChange(e.target.value)} />; }
function Select({ label, value, onChange, options, textKey, fallbackKey }) { return <select value={value || ''} onChange={e => onChange(e.target.value)}><option value="">{label}</option>{options.map(o => { const text = o[textKey] || o[fallbackKey] || o.name || o.plate || 'Tanım'; return <option key={o.id} value={o.id}>{text}</option>; })}</select>; }
function ReadOnly({ label, value }) { return <div className="readonly"><span>{label}</span><b>{value}</b></div>; }

createRoot(document.getElementById('root')).render(<App />);
