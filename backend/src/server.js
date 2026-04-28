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
  cities: 'erp_cities'
};

function cleanPayload(kind, payload) {
  if (['projects', 'drivers', 'escorts', 'countries'].includes(kind)) {
    return { name: String(payload.name || '').trim() };
  }
  if (['tractors', 'trailers', 'escortVehicles'].includes(kind)) {
    return {
      plate: String(payload.plate || '').trim().toUpperCase(),
      info: String(payload.info || '').trim() || null
    };
  }
  if (kind === 'cities') {
    return { country_id: payload.country_id, name: String(payload.name || '').trim() };
  }
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
      supabase.from('erp_cities').select('*').order('name')
    ]);
    const err = q.find(x => x.error);
    if (err) return fail(res, 400, err.error.message);
    res.json(ok({
      projects: q[0].data || [],
      drivers: q[1].data || [],
      tractors: q[2].data || [],
      trailers: q[3].data || [],
      escorts: q[4].data || [],
      escortVehicles: q[5].data || [],
      countries: q[6].data || [],
      cities: q[7].data || []
    }));
  } catch (e) {
    fail(res, 500, e.message);
  }
});

app.post('/definitions/:kind', async (req, res) => {
  const kind = req.params.kind;
  const table = tableMap[kind];
  if (!table) return fail(res, 404, 'Tanım türü bulunamadı.');

  const payload = cleanPayload(kind, req.body || {});
  if (['projects', 'drivers', 'escorts', 'countries'].includes(kind) && !payload.name) return fail(res, 422, 'Ad alanı zorunlu.');
  if (['tractors', 'trailers', 'escortVehicles'].includes(kind) && !payload.plate) return fail(res, 422, 'Plaka alanı zorunlu.');
  if (kind === 'cities' && (!payload.country_id || !payload.name)) return fail(res, 422, 'Şehir için ülke ve şehir adı zorunlu.');

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

const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`Yilnak ERP API port ${port}`));
