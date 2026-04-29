import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase } from './supabase.js';

dotenv.config();

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '2mb' }));

const ok = (data) => ({ ok: true, data });
const fail = (res, status, error) => res.status(status).json({ ok: false, error: String(error) });

const tableMap = {
  projects: 'erp_projects',
  drivers: 'erp_drivers',
  tractors: 'erp_tractors',
  trailers: 'erp_trailers',
  escorts: 'erp_escorts',
  escortVehicles: 'erp_escort_vehicles',
  countries: 'erp_countries',
  cities: 'erp_cities',
  expenseDefinitions: 'erp_expense_definitions',
  allowanceDefinitions: 'erp_allowance_definitions'
};

function cleanPayload(kind, payload) {
  if (['projects', 'drivers', 'escorts', 'countries'].includes(kind)) return { name: String(payload.name || '').trim() };
  if (['tractors', 'trailers', 'escortVehicles'].includes(kind)) return { plate: String(payload.plate || '').trim().toUpperCase(), info: String(payload.info || '').trim() || null };
  if (kind === 'cities') return { country_id: payload.country_id, name: String(payload.name || '').trim() };
  if (kind === 'allowanceDefinitions') return { name: String(payload.name || '').trim(), domestic_daily_amount: Number(payload.domestic_daily_amount || 0), domestic_currency: String(payload.domestic_currency || 'TRY').trim().toUpperCase(), abroad_daily_amount: Number(payload.abroad_daily_amount || 0), abroad_currency: String(payload.abroad_currency || 'EUR').trim().toUpperCase(), is_active: payload.is_active !== false };
  if (kind === 'expenseDefinitions') return { name: String(payload.name || '').trim(), category: String(payload.category || '').trim(), default_currency: String(payload.default_currency || 'TRY').trim().toUpperCase() };
  return payload;
}


async function getOrCreateBy(table, match, payload) {
  const key = Object.keys(match)[0];
  const value = match[key];

  const existing = await supabase.from(table).select('*').eq(key, value).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data;

  const created = await supabase.from(table).insert(payload).select('*').single();
  if (created.error) throw created.error;
  return created.data;
}

async function seedSampleProject() {
  try {
    const projectName = 'ÖRNEK PROJE - MAGDENLİ TEST';

    const existingTrip = await supabase
      .from('erp_trips')
      .select('id')
      .eq('project_name', projectName)
      .maybeSingle();

    if (existingTrip.error) throw existingTrip.error;
    if (existingTrip.data) return;

    const project = await getOrCreateBy('erp_projects', { name: projectName }, { name: projectName });
    const driver = await getOrCreateBy('erp_drivers', { name: 'Örnek Şoför Ali' }, { name: 'Örnek Şoför Ali' });
    const escort = await getOrCreateBy('erp_escorts', { name: 'Örnek Öncü Mehmet' }, { name: 'Örnek Öncü Mehmet' });
    const tractor = await getOrCreateBy('erp_tractors', { plate: '34 YNK 001' }, { plate: '34 YNK 001', info: 'Örnek çekici' });
    const trailer = await getOrCreateBy('erp_trailers', { plate: '34 DRS 001' }, { plate: '34 DRS 001', info: 'Örnek dorse' });
    const escortVehicle = await getOrCreateBy('erp_escort_vehicles', { plate: '34 ONC 001' }, { plate: '34 ONC 001', info: 'Örnek öncü araç' });

    const turkey = await getOrCreateBy('erp_countries', { name: 'Türkiye' }, { name: 'Türkiye' });
    const germany = await getOrCreateBy('erp_countries', { name: 'Almanya' }, { name: 'Almanya' });

    const istanbul = await getOrCreateBy('erp_cities', { name: 'İstanbul' }, { country_id: turkey.id, name: 'İstanbul' });
    const munich = await getOrCreateBy('erp_cities', { name: 'Münih' }, { country_id: germany.id, name: 'Münih' });

    const fuel = await getOrCreateBy('erp_expense_definitions', { name: 'Örnek Mazot' }, { name: 'Örnek Mazot', category: 'Yakıt', default_currency: 'EUR' });
    const toll = await getOrCreateBy('erp_expense_definitions', { name: 'Örnek Otoban' }, { name: 'Örnek Otoban', category: 'Yol', default_currency: 'EUR' });
    const doc = await getOrCreateBy('erp_expense_definitions', { name: 'Örnek Yol Belgesi' }, { name: 'Örnek Yol Belgesi', category: 'Belge', default_currency: 'TRY' });

    await getOrCreateBy('erp_allowance_definitions', { name: 'Örnek Harcırah' }, {
      name: 'Örnek Harcırah',
      domestic_daily_amount: 1200,
      domestic_currency: 'TRY',
      abroad_daily_amount: 40,
      abroad_currency: 'EUR',
      is_active: true
    });

    const tripPayload = {
      project_id: project.id,
      project_name: projectName,
      load_type: 'Trafo',
      load_width: 420,
      load_height: 460,
      load_length: 1200,
      load_weight: 72000,
      tractor_tonnage: 18000,
      trailer_tonnage: 24000,
      tonnage_capacity_formula: 130000,
      start_country_id: turkey.id,
      start_city_id: istanbul.id,
      unloading_country_id: germany.id,
      unloading_city_id: munich.id,
      end_country_id: turkey.id,
      end_city_id: istanbul.id,
      trip_count: 1,
      start_km: 100000,
      end_km: 104250,
      domestic_start_date: '2026-04-01',
      domestic_exit_date: '2026-04-03',
      abroad_entry_date: '2026-04-03',
      abroad_exit_date: '2026-04-10',
      domestic_return_date: '2026-04-11',
      domestic_end_date: '2026-04-12',
      domestic_work_days: 5,
      abroad_work_days: 8,
      escort_goes_abroad: true,
      driver_id: driver.id,
      tractor_id: tractor.id,
      trailer_id: trailer.id,
      escort_id: escort.id,
      escort_vehicle_id: escortVehicle.id
    };

    const tripInsert = await supabase.from('erp_trips').insert(tripPayload).select('*').single();
    if (tripInsert.error) throw tripInsert.error;
    const trip = tripInsert.data;

    const expenseRows = [
      { trip_id: trip.id, expense_definition_id: fuel.id, country_id: turkey.id, city_id: istanbul.id, vehicle_type: 'Çekici', fuel_status: 'Boş', liter: 320, amount: 18000, currency: 'TRY', expense_date: '2026-04-01', note: 'Örnek boş yurt içi yakıt' },
      { trip_id: trip.id, expense_definition_id: fuel.id, country_id: germany.id, city_id: munich.id, vehicle_type: 'Çekici', fuel_status: 'Dolu', liter: 740, amount: 1250, currency: 'EUR', expense_date: '2026-04-05', note: 'Örnek dolu yurt dışı yakıt' },
      { trip_id: trip.id, expense_definition_id: fuel.id, country_id: turkey.id, city_id: istanbul.id, vehicle_type: 'Öncü', fuel_status: 'Dolu', liter: 180, amount: 9800, currency: 'TRY', expense_date: '2026-04-02', note: 'Örnek öncü yakıt' },
      { trip_id: trip.id, expense_definition_id: toll.id, country_id: germany.id, city_id: munich.id, vehicle_type: 'Çekici', amount: 420, currency: 'EUR', expense_date: '2026-04-06', note: 'Örnek çekici otoyol' },
      { trip_id: trip.id, expense_definition_id: toll.id, country_id: germany.id, city_id: munich.id, vehicle_type: 'Öncü', amount: 160, currency: 'EUR', expense_date: '2026-04-06', note: 'Örnek öncü otoyol' },
      { trip_id: trip.id, expense_definition_id: doc.id, country_id: turkey.id, city_id: istanbul.id, vehicle_type: 'Çekici', amount: 3500, currency: 'TRY', expense_date: '2026-04-01', note: 'Örnek yol belgesi' }
    ];

    const expenseInsert = await supabase.from('erp_expenses').insert(expenseRows);
    if (expenseInsert.error) throw expenseInsert.error;

    const advanceInsert = await supabase.from('erp_advances').insert({
      trip_id: trip.id,
      receiver_type: 'Şoför',
      receiver_name: 'Örnek Şoför Ali',
      amount: 500,
      currency: 'EUR',
      advance_date: '2026-04-01',
      description: 'Örnek sefer avansı'
    });
    if (advanceInsert.error) throw advanceInsert.error;

    const allowanceInsert = await supabase.from('erp_allowances').insert({
      trip_id: trip.id,
      domestic_start_date: '2026-04-01',
      domestic_exit_date: '2026-04-03',
      domestic_return_date: '2026-04-11',
      domestic_end_date: '2026-04-12',
      domestic_days: 5,
      domestic_daily_amount: 1200,
      domestic_currency: 'TRY',
      domestic_total: 6000,
      abroad_entry_date: '2026-04-03',
      abroad_exit_date: '2026-04-10',
      abroad_days: 8,
      abroad_daily_amount: 40,
      abroad_currency: 'EUR',
      abroad_total: 320,
      note: 'Örnek harcırah'
    });
    if (allowanceInsert.error) throw allowanceInsert.error;
  } catch (err) {
    console.error('Örnek proje eklenemedi:', err.message);
  }
}


app.get('/', (_, res) => res.json(ok({ name: 'Yılnak & Mağdenli ERP API', status: 'running' })));
app.get('/health', (_, res) => res.json(ok({ status: 'running' })));


app.get('/definitions', async (_, res) => {
  try {
    const q = await Promise.all([
      supabase.from('erp_projects').select('*').order('name'),
      supabase.from('erp_drivers').select('*').order('name'),
      supabase.from('erp_tractors').select('*').order('plate'),
      supabase.from('erp_trailers').select('*').order('plate'),
      supabase.from('erp_escorts').select('*').order('name'),
      supabase.from('erp_escort_vehicles').select('*').order('plate'),
      supabase.from('erp_countries').select('*').order('name'),
      supabase.from('erp_cities').select('*').order('name'),
      supabase.from('erp_expense_definitions').select('*').order('name'),
      supabase.from('erp_allowance_definitions').select('*').order('created_at', { ascending: false })
    ]);

    const firstError = q.find(x => x.error)?.error;
    if (firstError) throw firstError;

    res.json(ok({
      projects: q[0].data || [],
      drivers: q[1].data || [],
      tractors: q[2].data || [],
      trailers: q[3].data || [],
      escorts: q[4].data || [],
      escortVehicles: q[5].data || [],
      countries: q[6].data || [],
      cities: q[7].data || [],
      expenseDefinitions: q[8].data || [],
      allowanceDefinitions: q[9].data || []
    }));
  } catch (err) { fail(res, 500, err.message); }
});


app.post('/definitions/:kind', async (req, res) => {
  try {
    const { kind } = req.params;
    const table = tableMap[kind];
    if (!table) return fail(res, 400, 'Geçersiz tanım türü');

    const payload = cleanPayload(kind, req.body || {});
    const { data, error } = await supabase.from(table).insert(payload).select('*').single();
    if (error) throw error;

    res.json(ok(data));
  } catch (err) {
    fail(res, 500, err.message);
  }
});

app.put('/definitions/:kind/:id', async (req, res) => {
  try {
    const { kind, id } = req.params;
    const table = tableMap[kind];
    if (!table) return fail(res, 400, 'Geçersiz tanım türü');

    const payload = cleanPayload(kind, req.body || {});
    const { data, error } = await supabase.from(table).update(payload).eq('id', id).select('*').single();
    if (error) throw error;

    res.json(ok(data));
  } catch (err) {
    fail(res, 500, err.message);
  }
});

app.delete('/definitions/:kind/:id', async (req, res) => {
  try {
    const { kind, id } = req.params;
    const table = tableMap[kind];
    if (!table) return fail(res, 400, 'Geçersiz tanım türü');

    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;

    res.json(ok({ id, deleted: true }));
  } catch (err) {
    fail(res, 500, err.message);
  }
});


app.get('/trips', async (_, res) => {
  const { data, error } = await supabase.from('erp_trips').select('*').order('created_at', { ascending: false });
  if (error) return fail(res, 400, error.message);
  res.json(ok(data || []));
});

app.post('/trips', async (req, res) => {
  const { data, error } = await supabase.from('erp_trips').insert(req.body || {}).select().single();
  if (error) return fail(res, 400, error.message);
  res.json(ok(data));
});

app.get('/advances', async (_, res) => {
  const { data, error } = await supabase
    .from('erp_advances')
    .select(`*, trip:erp_trips(project_name, created_at)`)
    .order('created_at', { ascending: false });
  if (error) return fail(res, 400, error.message);
  res.json(ok((data || []).map(x => ({ ...x, trip_name: x.trip?.project_name || 'Projesiz Sefer' }))));
});

app.post('/advances', async (req, res) => {
  const payload = req.body || {};
  if (!payload.trip_id) return fail(res, 422, 'Sefer zorunlu.');
  if (!payload.receiver_type) return fail(res, 422, 'Avans alan tipi zorunlu.');
  if (!payload.receiver_name) return fail(res, 422, 'Avans alan kişi/firma zorunlu.');
  if (!payload.amount) return fail(res, 422, 'Tutar zorunlu.');
  const clean = {
    trip_id: payload.trip_id,
    receiver_type: payload.receiver_type,
    receiver_name: String(payload.receiver_name || '').trim(),
    amount: payload.amount,
    currency: payload.currency || 'TRY',
    advance_date: payload.advance_date || null,
    description: payload.note || payload.description || null
  };
  const { data, error } = await supabase.from('erp_advances').insert(clean).select().single();
  if (error) return fail(res, 400, error.message);
  res.json(ok(data));
});

app.get('/expenses', async (_, res) => {
  const { data, error } = await supabase
    .from('erp_expenses')
    .select(`*, expense:erp_expense_definitions(name, category), country:erp_countries(name), city:erp_cities(name)`)
    .order('created_at', { ascending: false });
  if (error) return fail(res, 400, error.message);
  res.json(ok((data || []).map(x => ({ ...x, expense_name: x.expense?.name || null, category: x.expense?.category || null, country_name: x.country?.name || null, city_name: x.city?.name || null }))));
});

app.post('/expenses', async (req, res) => {
  const payload = req.body || {};
  if (!payload.trip_id) return fail(res, 422, 'Sefer zorunlu.');
  if (!payload.expense_definition_id) return fail(res, 422, 'Masraf türü zorunlu.');
  if (!payload.amount) return fail(res, 422, 'Tutar zorunlu.');
  const { data: def, error: defError } = await supabase.from('erp_expense_definitions').select('category, default_currency').eq('id', payload.expense_definition_id).single();
  if (defError) return fail(res, 400, defError.message);
  if (def.category === 'Yakıt' && !payload.fuel_status) return fail(res, 422, 'Yakıt için Boş/Dolu zorunlu.');
  if (def.category === 'Yakıt' && !payload.liter) return fail(res, 422, 'Yakıt için litre zorunlu.');
  const clean = {
    trip_id: payload.trip_id,
    expense_definition_id: payload.expense_definition_id,
    country_id: payload.country_id || null,
    city_id: payload.city_id || null,
    vehicle_type: payload.vehicle_type || null,
    fuel_status: def.category === 'Yakıt' ? payload.fuel_status : null,
    liter: def.category === 'Yakıt' ? payload.liter : null,
    amount: payload.amount,
    currency: payload.currency || def.default_currency || 'TRY',
    expense_date: payload.expense_date || null,
    description: payload.note || payload.description || null
  };
  const { data, error } = await supabase.from('erp_expenses').insert(clean).select().single();
  if (error) return fail(res, 400, error.message);
  res.json(ok(data));
});

const port = process.env.PORT || 10000;

app.get('/allowances', async (_, res) => {
  try {
    const { data, error } = await supabase
      .from('erp_allowances')
      .select('*, erp_trips(project_name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(ok((data || []).map(x => ({ ...x, trip_name: x.erp_trips?.project_name }))));
  } catch (err) { fail(res, 500, err.message); }
});

app.post('/allowances', async (req, res) => {
  try {
    const payload = {
      trip_id: req.body.trip_id || null,
      domestic_start_date: req.body.domestic_start_date || null,
      domestic_exit_date: req.body.domestic_exit_date || null,
      domestic_return_date: req.body.domestic_return_date || null,
      domestic_end_date: req.body.domestic_end_date || null,
      domestic_days: req.body.domestic_days || 0,
      domestic_daily_amount: req.body.domestic_daily_amount || 0,
      domestic_currency: req.body.domestic_currency || 'TRY',
      domestic_total: req.body.domestic_total || 0,
      abroad_entry_date: req.body.abroad_entry_date || null,
      abroad_exit_date: req.body.abroad_exit_date || null,
      abroad_days: req.body.abroad_days || 0,
      abroad_daily_amount: req.body.abroad_daily_amount || 0,
      abroad_currency: req.body.abroad_currency || 'EUR',
      abroad_total: req.body.abroad_total || 0,
      note: req.body.note || null
    };
    const { data, error } = await supabase.from('erp_allowances').insert(payload).select('*').single();
    if (error) throw error;
    res.json(ok(data));
  } catch (err) { fail(res, 400, err.message); }
});


app.listen(port, async () => {
  console.log(`Yilnak ERP API port ${port}`);
  await seedSampleProject();
});
