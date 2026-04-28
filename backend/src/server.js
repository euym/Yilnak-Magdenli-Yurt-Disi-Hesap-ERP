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

app.get('/', (_, res) => res.json(ok({ name: 'Yılnak & Mağdenli ERP API', status: 'running' })));
app.get('/health', (_, res) => res.json(ok({ status: 'running' })));

app.get('/definitions', async (_, res) => {
  try {
    const [
      projects,
      drivers,
      tractors,
      trailers,
      escorts,
      escortVehicles,
      countries,
      cities
    ] = await Promise.all([
      supabase.from('erp_projects').select('*').order('name'),
      supabase.from('erp_drivers').select('*').order('name'),
      supabase.from('erp_tractors').select('*').order('plate'),
      supabase.from('erp_trailers').select('*').order('plate'),
      supabase.from('erp_escorts').select('*').order('name'),
      supabase.from('erp_escort_vehicles').select('*').order('plate'),
      supabase.from('erp_countries').select('*').order('name'),
      supabase.from('erp_cities').select('*').order('name')
    ]);

    const err = [projects, drivers, tractors, trailers, escorts, escortVehicles, countries, cities].find(x => x.error);
    if (err) return fail(res, 400, err.error.message);

    res.json(ok({
      projects: projects.data || [],
      drivers: drivers.data || [],
      tractors: tractors.data || [],
      trailers: trailers.data || [],
      escorts: escorts.data || [],
      escortVehicles: escortVehicles.data || [],
      countries: countries.data || [],
      cities: cities.data || []
    }));
  } catch (e) {
    fail(res, 500, e.message);
  }
});

app.post('/definitions/:kind', async (req, res) => {
  const table = tableMap[req.params.kind];
  if (!table) return fail(res, 404, 'Tanım türü bulunamadı.');

  const payload = req.body || {};
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
  const body = req.body || {};
  const { data, error } = await supabase.from('erp_trips').insert(body).select().single();
  if (error) return fail(res, 400, error.message);
  res.json(ok(data));
});

const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`Yilnak ERP API port ${port}`));