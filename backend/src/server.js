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
    const err = q.find(x => x.error);
    if (err) return fail(res, 400, err.error.message);
    res.json(ok({
      projects: q[0].data || [], drivers: q[1].data || [], tractors: q[2].data || [], trailers: q[3].data || [], escorts: q[4].data || [], escortVehicles: q[5].data || [], countries: q[6].data || [], cities: q[7].data || [], expenseDefinitions: q[8].data || [],
      allowanceDefinitions: q[9].data || []
    }));
  } catch (e) { fail(res, 500, e.message); }
});

app.post('/definitions/:kind', async (req, res) => {
  const kind = req.params.kind;
  const table = tableMap[kind];
  if (!table) return fail(res, 404, 'Tanım türü bulunamadı.');
  const payload = cleanPayload(kind, req.body || {});
  if (['projects', 'drivers', 'escorts', 'countries'].includes(kind) && !payload.name) return fail(res, 422, 'Ad alanı zorunlu.');
  if (['tractors', 'trailers', 'escortVehicles'].includes(kind) && !payload.plate) return fail(res, 422, 'Plaka alanı zorunlu.');
  if (kind === 'cities' && (!payload.country_id || !payload.name)) return fail(res, 422, 'Şehir için ülke ve şehir adı zorunlu.');
  if (kind === 'expenseDefinitions' && (!payload.name || !payload.category)) return fail(res, 422, 'Masraf adı ve kategori zorunlu.');
  const { data, error } = await supabase.from(table).insert(payload).select().single();
  if (error) return fail(res, 400, error.message);
  res.json(ok(data));
});

app.delete('/definitions/:kind/:id', async (req, res) => {
  const table = tableMap[req.params.kind];
  if (!table) return fail(res, 404, 'Tanım türü bulunamadı.');
  const { error } = await supabase.from(table).delete().eq('id', req.params.id);
  if (error) return fail(res, 400, error.message);
  res.json(ok({ deleted: true }));
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
    note: payload.note || null
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
    note: payload.note || null
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


app.listen(port, () => console.log(`Yilnak ERP API port ${port}`));
